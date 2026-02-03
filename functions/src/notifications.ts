import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { differenceInDays } from 'date-fns';
import { onRequest } from "firebase-functions/v2/https";

if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

interface AlertPayload {
    roles: string[];
    category: string;
    title: string;
    body: string;
}

// Helper: Send Multicast Message
const sendNotifications = async (tokens: string[], title: string, body: string, data?: any) => {
    if (tokens.length === 0) return;

    // Deduplicate tokens
    const uniqueTokens = [...new Set(tokens)];

    // Batches of 500 (FCM limit)
    const batchSize = 500;
    for (let i = 0; i < uniqueTokens.length; i += batchSize) {
        const batchTokens = uniqueTokens.slice(i, i + batchSize);
        try {
            const response = await messaging.sendEachForMulticast({
                tokens: batchTokens,
                notification: {
                    title,
                    body,
                },
                data: data || {},
                android: { priority: 'high' },
                apns: {
                    payload: {
                        aps: { contentAvailable: true }
                    }
                }
            });
            logger.info(`Sent ${batchTokens.length} notifications. Success: ${response.successCount}, Failure: ${response.failureCount}`);
        } catch (error) {
            logger.error("Error sending notifications batch:", error);
        }
    }
};

// Helper: Get Users by Role and Category
// Categories: 'Fútbol', 'F. Sala', 'Femenino', 'General' (or null)
const getRecipients = async (roles: string[], category: string | null = null) => {
    let q: admin.firestore.Query = db.collection('users').where('role', 'in', roles);

    const snapshot = await q.get();
    const tokens: string[] = [];

    snapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.fcmToken) {
            // Apply Category Filter if strictly required
            const userCategory = userData.category || userData.userSport || 'General';

            if (category && userCategory !== 'General' && category !== 'General') {
                if (userCategory !== category) return;
            }

            tokens.push(userData.fcmToken);
        }
    });

    return tokens;
};

// Helper for Payments
function checkPaymentAlert(player: any, dueDateStr: string, label: string, roles: string[], alertsList: AlertPayload[]) {
    try {
        const today = new Date();
        const dueDate = new Date(dueDateStr);
        if (isNaN(dueDate.getTime())) return;

        const daysDiff = differenceInDays(dueDate, today);
        const name = player.name || 'Jugador';
        const category = 'Finanzas';

        // Alert on: 15 days left, 3 days left, Overdue (0, -7, -30)
        const notifyDays = [15, 3, 0, -7, -30];

        if (notifyDays.includes(daysDiff)) {
            let title = daysDiff < 0 ? `🚨 ${label.toUpperCase()} VENCIDO` : `💰 ${label} Próximo`;
            let body = daysDiff < 0
                ? `${name}: Vencido hace ${Math.abs(daysDiff)} días.`
                : `${name}: Vence en ${daysDiff} días.`;

            alertsList.push({ roles, category, title, body });
        }

    } catch (e) {
        logger.error("Payment alert check error", e);
    }
}

/**
 * 1. CHECK DAILY ALERTS (Scheduled 10:00 AM Europe/Madrid)
 */
export const checkDailyAlerts = onSchedule({
    schedule: "0 10 * * *",
    timeZone: "Europe/Madrid",
    retryCount: 3
}, async (event) => {
    logger.info("Starting Daily Alert Check...");

    const today = new Date();
    const alertsToSend: AlertPayload[] = [];

    // --- A. LOAD PLAYERS ---
    const playersSnap = await db.collection('players').get();
    const scoutingSnap = await db.collection('scouting_players').get();

    // Combine for generic checks (Birthdays)
    const allDocs = [...playersSnap.docs, ...scoutingSnap.docs];

    // --- B. BIRTHDAYS (Hoy) ---
    // Roles: Agente, Scout, Director, Admin
    // Filter: Category
    for (const doc of allDocs) {
        const p = doc.data() as any;
        if (!p.birthDate) continue;

        try {
            const dob = new Date(p.birthDate);
            if (dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth()) {
                const age = today.getFullYear() - dob.getFullYear();
                const name = p.name || p.firstName || 'Jugador';
                const category = p.category || 'General';

                alertsToSend.push({
                    roles: ['admin', 'director', 'scout', 'agente'],
                    category: category,
                    title: `🎉 Cumpleaños de ${name}`,
                    body: `Hoy cumple ${age} años.`
                });
            }
        } catch (e) {
            logger.warn("Date error for player", doc.id);
        }
    }

    // --- C. CLAUSES (Critical - Optional Notice) ---
    // Roles: Admin, Director, Agente
    // Logic: 60 days warning, etc
    for (const doc of playersSnap.docs) {
        const p = doc.data() as any;
        if (!p.contract?.optionalNoticeDate) continue;

        try {
            const noticeDate = new Date(p.contract.optionalNoticeDate);
            const daysDiff = differenceInDays(noticeDate, today);

            const notifyDays = [60, 30, 7, 0, -1, -7];

            if (notifyDays.includes(daysDiff)) {
                const name = p.name || 'Jugador';
                const category = p.category || 'General';
                let title = daysDiff < 0 ? '🚨 CLÁUSULA VENCIDA' : '⚠️ Cláusula Opcional Próxima';
                let body = daysDiff < 0
                    ? `El plazo de ${name} venció hace ${Math.abs(daysDiff)} días.`
                    : `El plazo de ${name} vence en ${daysDiff} días.`;

                alertsToSend.push({
                    roles: ['admin', 'director', 'agente'],
                    category: category,
                    title,
                    body
                });
            }
        } catch (e) { }
    }

    // --- D. PAYMENTS (Critical - Financial) ---
    // Roles: Admin, Director, Tesorero
    for (const doc of playersSnap.docs) {
        const p = doc.data() as any;
        if (!p.contractYears || !Array.isArray(p.contractYears)) continue;

        for (const year of p.contractYears) {
            // Check Club Payment
            if (year.clubPayment?.status === 'Pendiente' && year.clubPayment.dueDate) {
                checkPaymentAlert(p, year.clubPayment.dueDate, 'Cobro Club', ['admin', 'director', 'tesorero'], alertsToSend);
            }
            // Check Player Payment
            if (year.playerPayment?.status === 'Pendiente' && year.playerPayment.dueDate) {
                checkPaymentAlert(p, year.playerPayment.dueDate, 'Cobro Jugador', ['admin', 'director', 'tesorero'], alertsToSend);
            }
        }
    }

    // --- EXECUTE SENDING ---
    for (const alert of alertsToSend) {
        const recipients = await getRecipients(alert.roles, alert.category);
        if (recipients.length > 0) {
            await sendNotifications(recipients, alert.title, alert.body);
        }
    }

    logger.info(`Daily check finished. Processed ${allDocs.length} players.`);
});

/**
 * 2. TRIGGER: NEW SIGNED CONTRACT
 * Admin, Director, Tesorero
 */
export const onPlayerContractSigned = onDocumentUpdated("players/{playerId}", async (event) => {
    if (!event.data) return;
    const before = event.data.before.data();
    const after = event.data.after.data();

    if (!after) return;

    // Check if status changed TO 'PendingValidation'
    const statusChanged = before?.proneoStatus !== 'PendingValidation' && after.proneoStatus === 'PendingValidation';

    if (statusChanged) {
        const name = after.name || after.firstName || 'Jugador';

        logger.info(`Trigger: Contract signed by ${name}`);

        const roles = ['admin', 'director', 'tesorero'];
        const tokens = await getRecipients(roles, 'General');

        await sendNotifications(
            tokens,
            "🚨 CONTRATO FIRMADO",
            `${name} ha firmado su renovación. Requiere validación.`
        );
    }
});

/**
 * MANUAL TEST TRIGGER
 * URL: http://127.0.0.1:5001/proneomanager/us-central1/testDailyAlerts
 */
export const testDailyAlerts = onRequest(async (req, res) => {
    logger.info("MANUAL TRIGGER: Starting Daily Alert Check...");
    const logs: string[] = [];

    const log = (msg: string) => {
        logger.info(msg);
        logs.push(msg);
    };

    try {
        const today = new Date();
        // Force specific date if needed for testing, e.g.:
        // const today = new Date('2026-02-02T10:00:00'); 

        const alertsToSend: AlertPayload[] = [];
        const playersSnap = await db.collection('players').get();
        const scoutingSnap = await db.collection('scouting_players').get();
        const allDocs = [...playersSnap.docs, ...scoutingSnap.docs];

        log(`Loaded ${allDocs.length} total docs.`);

        // --- COPY OF LOGIC (Simplified for Test) ---
        // B. BIRTHDAYS
        for (const doc of allDocs) {
            const p = doc.data() as any;
            if (!p.birthDate) continue;
            try {
                const dob = new Date(p.birthDate);
                if (dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth()) {
                    log(`MATCH: Birthday ${p.name}`);
                    alertsToSend.push({ roles: ['admin'], category: 'General', title: 'Test Birthday', body: `Cumpleaños: ${p.name}` });
                }
            } catch (e) { }
        }

        // C. CLAUSES
        for (const doc of playersSnap.docs) {
            const p = doc.data() as any;
            if (p.contract?.optionalNoticeDate) {
                const noticeDate = new Date(p.contract.optionalNoticeDate);
                const daysDiff = differenceInDays(noticeDate, today);
                const notifyDays = [60, 30, 7, 0, -1, -7];
                if (notifyDays.includes(daysDiff)) {
                    log(`MATCH: Clause ${p.name} (Diff: ${daysDiff})`);
                    alertsToSend.push({ roles: ['admin'], category: 'General', title: 'Test Clause', body: `Cláusula: ${p.name}` });
                }
            }
        }

        // SENDING
        for (const alert of alertsToSend) {
            log(`Sending alert: ${alert.title} to roles ${alert.roles}`);
            const recipients = await getRecipients(alert.roles, alert.category);
            log(`Found ${recipients.length} tokens.`);
            // UNCOMMENT TO ACTUALLY SEND IN TEST:
            // if (recipients.length > 0) await sendNotifications(recipients, alert.title, alert.body);
        }

        res.json({ success: true, logs, alertsFound: alertsToSend.length });

    } catch (error: any) {
        logger.error(error);
        res.status(500).json({ error: error.message });
    }
});

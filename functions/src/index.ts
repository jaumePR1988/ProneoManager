import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Cloud Function que se dispara cuando se añade un documento a 'push_messages'.
 * Actúa como el "cartero" que lleva el mensaje del PC al móvil.
 */
export const onPushMessageCreated = functions.firestore
    .document("push_messages/{messageId}")
    .onCreate(async (snapshot, context) => {
        const data = snapshot.data();
        if (!data) return;

        const { title, message, target } = data;

        try {
            // 1. Buscar los tokens de los usuarios destinatarios
            let userQuery: admin.firestore.Query = admin.firestore().collection("users");

            // Si el target no es 'Todos', filtramos por la especialidad (sport)
            if (target && target !== "Todos") {
                userQuery = userQuery.where("sport", "==", target);
            }

            const userSnapshot = await userQuery.get();
            const tokens: string[] = [];

            userSnapshot.forEach((doc) => {
                const userData = doc.data();
                if (userData.fcmToken) {
                    tokens.push(userData.fcmToken);
                }
            });

            if (tokens.length === 0) {
                console.log("No se encontraron dispositivos para el target:", target);
                return;
            }

            // 2. Construir y enviar el mensaje multicast
            const payload: admin.messaging.MulticastMessage = {
                tokens: [...new Set(tokens)], // Evitar duplicados
                notification: {
                    title: title,
                    body: message,
                },
                webpush: {
                    notification: {
                        icon: "https://proneomanager.web.app/logo-192.png",
                        badge: "https://proneomanager.web.app/logo-192.png",
                        click_action: "https://proneomobile-app.web.app",
                    },
                },
            };

            const response = await admin.messaging().sendEachForMulticast(payload);

            // 3. Registrar el resultado en el documento para trazabilidad
            await snapshot.ref.update({
                status: "sent",
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                successCount: response.successCount,
                failureCount: response.failureCount,
            });

            console.log(`Mensaje enviado con éxito a ${response.successCount} dispositivos.`);

        } catch (error) {
            console.error("Error enviating push notifications:", error);
            await snapshot.ref.update({
                status: "error",
                error: error instanceof Error ? error.message : "Error desconocido",
            });
        }
    });

/**
 * Escáner diario que se ejecuta a las 10:00 AM.
 * Busca cumpleaños y vencimientos de contrato para enviar avisos push automáticos.
 */
export const dailyAlertScanner = functions.pubsub
    .schedule("0 10 * * *")
    .timeZone("Europe/Madrid")
    .onRun(async (context) => {
        const today = new Date();
        const playersSnapshot = await admin.firestore().collection("players").get();
        const scoutingSnapshot = await admin.firestore().collection("players_scouting").get();
        const alertsToSend: { target: string; title: string; message: string; priority: string }[] = [];

        // Helper to parse DD/MM/YYYY
        const parseDMY = (dateStr: string) => {
            const [d, m, y] = dateStr.split("/");
            return new Date(Number(y), Number(m) - 1, Number(d));
        };

        const processPlayer = (p: any, isScouting: boolean) => {
            const category = p.category || "Fútbol";

            // 1. Verificar Cumpleaños
            if (p.birthDate) {
                const dob = p.birthDate.includes('/') ? parseDMY(p.birthDate) : new Date(p.birthDate);
                if (dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth()) {
                    alertsToSend.push({
                        target: category,
                        title: "🎂 ¡Cumpleaños Hoy!",
                        message: `${p.name} cumple años hoy.`,
                        priority: 'normal'
                    });
                }
            }

            // 2. Avisos Prioritarios: Cláusulas Opcionales
            if (p.contract?.optionalNoticeDate) {
                const noticeDate = p.contract.optionalNoticeDate.includes('/') ? parseDMY(p.contract.optionalNoticeDate) : new Date(p.contract.optionalNoticeDate);
                const diffDays = Math.ceil((noticeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                if (diffDays === 30 || diffDays === 15 || diffDays === 7 || diffDays === 1) {
                    alertsToSend.push({
                        target: category,
                        title: "🚨 Límite Cláusula Opcional",
                        message: `${p.name}: El plazo para decidir sobre el año opcional vence en ${diffDays} días (${p.contract.optionalNoticeDate}).`,
                        priority: 'critical'
                    });
                }
            }

            // 3. Avisos Prioritarios: Cobros Pendientes (Si es Admin/Tesorero)
            if (p.contractYears) {
                p.contractYears.forEach((year: any) => {
                    ['clubPayment', 'playerPayment'].forEach(type => {
                        const pay = year[type];
                        if (pay?.status === 'Pendiente' && pay.dueDate) {
                            const dueDate = pay.dueDate.includes('/') ? parseDMY(pay.dueDate) : new Date(pay.dueDate);
                            const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                            if (diffDays === 0) {
                                alertsToSend.push({
                                    target: 'Finanzas', // Special target for financial alerts
                                    title: "💰 COBRO VENCIDO HOY",
                                    message: `${p.name}: Hoy vence el cobro de ${type === 'clubPayment' ? 'Club' : 'Jugador'} - ${year.year}.`,
                                    priority: 'critical'
                                });
                            }
                        }
                    });
                });
            }
        };

        playersSnapshot.forEach(doc => processPlayer(doc.data(), false));
        scoutingSnapshot.forEach(doc => processPlayer(doc.data(), true));

        // 4. Enviar las notificaciones acumuladas
        for (const alert of alertsToSend) {
            let tokens: string[] = [];

            if (alert.target === 'Finanzas') {
                // Send to Admins, Directors, and Treasurers
                const adminSnapshot = await admin.firestore().collection("users")
                    .where("role", "in", ["admin", "director", "tesorero"])
                    .get();
                adminSnapshot.forEach(uDoc => {
                    const d = uDoc.data();
                    if (d.fcmToken) tokens.push(d.fcmToken);
                });
            } else {
                // Send to users specialized in that category
                const userSnapshot = await admin.firestore().collection("users")
                    .where("sport", "==", alert.target)
                    .get();
                userSnapshot.forEach(uDoc => {
                    const d = uDoc.data();
                    if (d.fcmToken) tokens.push(d.fcmToken);
                });
            }

            if (tokens.length > 0) {
                const payload: admin.messaging.MulticastMessage = {
                    tokens: [...new Set(tokens)],
                    notification: {
                        title: alert.title,
                        body: alert.message,
                    },
                    webpush: {
                        notification: {
                            icon: "https://proneomanager.web.app/logo-192.png",
                            badge: "https://proneomanager.web.app/logo-192.png",
                            click_action: "https://proneomanager.web.app/avisos",
                        },
                    },
                    data: {
                        priority: alert.priority
                    }
                };
                await admin.messaging().sendEachForMulticast(payload);
            }
        }

        console.log(`Escaneo diario completado. Generadas ${alertsToSend.length} alertas.`);
        return null;
    });

/**
 * Cloud Function que notifica a los administradores cuando hay un nuevo registro.
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
    const adminSnapshot = await admin.firestore()
        .collection("users")
        .where("role", "in", ["admin", "director"])
        .get();

    const tokens: string[] = [];
    adminSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.fcmToken) tokens.push(data.fcmToken);
    });

    if (tokens.length > 0) {
        const payload: admin.messaging.MulticastMessage = {
            tokens: [...new Set(tokens)],
            notification: {
                title: "👤 Nueva Solicitud de Acceso",
                body: `${user.displayName || user.email} se ha registrado y espera aprobación.`,
            },
            webpush: {
                notification: {
                    icon: "https://proneomanager.web.app/logo-192.png",
                    click_action: "https://proneomobile-app.web.app",
                }
            }
        };
        return admin.messaging().sendEachForMulticast(payload);
    }
    return null;
});

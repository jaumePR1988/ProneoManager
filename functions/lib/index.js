"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyAlertScanner = exports.onPushMessageCreated = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
/**
 * Cloud Function que se dispara cuando se añade un documento a 'push_messages'.
 * Actúa como el "cartero" que lleva el mensaje del PC al móvil.
 */
exports.onPushMessageCreated = functions.firestore
    .document("push_messages/{messageId}")
    .onCreate(async (snapshot, context) => {
    const data = snapshot.data();
    if (!data)
        return;
    const { title, message, target } = data;
    try {
        // 1. Buscar los tokens de los usuarios destinatarios
        let userQuery = admin.firestore().collection("users");
        // Si el target no es 'Todos', filtramos por la especialidad (sport)
        if (target && target !== "Todos") {
            userQuery = userQuery.where("sport", "==", target);
        }
        const userSnapshot = await userQuery.get();
        const tokens = [];
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
        const payload = {
            tokens: [...new Set(tokens)],
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
    }
    catch (error) {
        console.error("Error enviating push notifications:", error);
        await snapshot.ref.update({
            status: "error",
            error: error instanceof Error ? error.message : "Error desconocido",
        });
    }
});
/**
 * Escáner diario que se ejecuta a las 08:00 AM.
 * Busca cumpleaños y vencimientos de contrato para enviar avisos push automáticos.
 */
exports.dailyAlertScanner = functions.pubsub
    .schedule("0 8 * * *")
    .timeZone("Europe/Madrid")
    .onRun(async (context) => {
    const today = new Date();
    const playersSnapshot = await admin.firestore().collection("players").get();
    const alertsToSend = [];
    playersSnapshot.forEach((doc) => {
        var _a;
        const p = doc.data();
        const category = p.category || "Fútbol";
        // 1. Verificar Cumpleaños
        if (p.birthDate) {
            const [d, m] = p.birthDate.split("/");
            if (Number(d) === today.getDate() && Number(m) === (today.getMonth() + 1)) {
                alertsToSend.push({
                    target: category,
                    title: "🎂 ¡Cumpleaños Hoy!",
                    message: `${p.name} cumple años hoy. ¡No olvides felicitarle!`
                });
            }
        }
        // 2. Verificar Vencimiento de Agencia (Proneo)
        if ((_a = p.proneo) === null || _a === void 0 ? void 0 : _a.agencyEndDate) {
            const [d, m, y] = p.proneo.agencyEndDate.split("/");
            const endDate = new Date(Number(y), Number(m) - 1, Number(d));
            const diffTime = endDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            // Avisar a los 180 días (6 meses) y 30 días (1 mes)
            if (diffDays === 180 || diffDays === 30) {
                alertsToSend.push({
                    target: category,
                    title: "⚠️ Vencimiento Próximo",
                    message: `El contrato de ${p.name} vence en ${diffDays === 180 ? '6 meses' : '1 mes'}.`
                });
            }
        }
    });
    // 3. Enviar las notificaciones acumuladas
    for (const alert of alertsToSend) {
        const userSnapshot = await admin.firestore()
            .collection("users")
            .where("sport", "==", alert.target)
            .get();
        const tokens = [];
        userSnapshot.forEach(uDoc => {
            const userData = uDoc.data();
            if (userData.fcmToken)
                tokens.push(userData.fcmToken);
        });
        if (tokens.length > 0) {
            const payload = {
                tokens: [...new Set(tokens)],
                notification: {
                    title: alert.title,
                    body: alert.message,
                },
                webpush: {
                    notification: {
                        icon: "https://proneomanager.web.app/logo-192.png",
                        badge: "https://proneomanager.web.app/logo-192.png",
                        click_action: "https://proneomobile-app.web.app",
                    },
                },
            };
            await admin.messaging().sendEachForMulticast(payload);
        }
    }
    console.log(`Escaneo diario completado. Generadas ${alertsToSend.length} alertas.`);
    return null;
});
//# sourceMappingURL=index.js.map
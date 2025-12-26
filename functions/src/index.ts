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

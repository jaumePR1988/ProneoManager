"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPlayerContractSigned = exports.checkDailyAlerts = exports.generateAndSignContract = exports.updatePlayerProfile = exports.uploadPlayerPhoto = exports.getPublicPlayerProfile = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();
/**
 * Get Public Player Profile
 * Returns only safe, public information about a player.
 */
exports.getPublicPlayerProfile = (0, https_1.onCall)({ cors: true }, async (request) => {
    const { playerId, pin } = request.data;
    if (!playerId || !pin) {
        throw new https_1.HttpsError('invalid-argument', 'Missing credentials');
    }
    try {
        // Try regular players first
        let playerDoc = await db.collection('players').doc(playerId).get();
        let isScouting = false;
        if (!playerDoc.exists) {
            // Try scouting players
            playerDoc = await db.collection('scouting_players').doc(playerId).get();
            isScouting = true;
        }
        if (!playerDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Player not found');
        }
        const data = playerDoc.data();
        // 1. SECURITY CHECK: Validate PIN
        // We compare the PIN provided by the user with the stored 'accessCode'
        if ((data === null || data === void 0 ? void 0 : data.accessCode) !== pin) {
            throw new https_1.HttpsError('permission-denied', 'Invalid Access Code');
        }
        // 2. GENERATE CUSTOM TOKEN
        // This token allows the client to sign in as this player
        const customToken = await admin.auth().createCustomToken(playerId, {
            role: 'player',
            isScouting: isScouting
        });
        // 3. RETURN DATA TO CLIENT
        return {
            token: customToken,
            player: {
                id: playerDoc.id,
                firstName: (data === null || data === void 0 ? void 0 : data.firstName) || '',
                lastName1: (data === null || data === void 0 ? void 0 : data.lastName1) || '',
                name: (data === null || data === void 0 ? void 0 : data.name) || (data === null || data === void 0 ? void 0 : data.firstName) || 'Jugador',
                club: (data === null || data === void 0 ? void 0 : data.club) || '',
                category: (data === null || data === void 0 ? void 0 : data.category) || '',
                position: (data === null || data === void 0 ? void 0 : data.position) || '',
                photoUrl: (data === null || data === void 0 ? void 0 : data.photoUrl) || null,
                isScouting: isScouting,
                accessCode: data === null || data === void 0 ? void 0 : data.accessCode,
                documents: (data === null || data === void 0 ? void 0 : data.documents) || [],
                seasons: (data === null || data === void 0 ? void 0 : data.seasons) || [],
                customFields: (data === null || data === void 0 ? void 0 : data.customFields) || { palmares: [], achievements: '' }
            }
        };
    }
    catch (error) {
        logger.error("Error getting public profile", error);
        throw new https_1.HttpsError('internal', 'Unable to retrieve player profile');
    }
});
/**
 * Upload Player Photo
 * Receives Base64 image, saves to storage, and updates Firestore.
 */
exports.uploadPlayerPhoto = (0, https_1.onCall)({ cors: true }, async (request) => {
    const { playerId, photoBase64, mimeType } = request.data; // e.g. "image/jpeg"
    if (!playerId || !photoBase64 || !mimeType) {
        throw new https_1.HttpsError('invalid-argument', 'Missing parameters');
    }
    // Validate MIME type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid image format. Use JPG, PNG or WebP.');
    }
    try {
        const bucket = storage.bucket();
        const buffer = Buffer.from(photoBase64, 'base64');
        // Check size (approximate from buffer) - Limit to ~5MB
        if (buffer.length > 5 * 1024 * 1024) {
            throw new https_1.HttpsError('resource-exhausted', 'Image too large (Max 5MB)');
        }
        // Determine collection
        // ... existing exports
        let collectionName = 'players';
        let playerRef = db.collection('players').doc(playerId);
        let playerSnap = await playerRef.get();
        if (!playerSnap.exists) {
            collectionName = 'scouting_players';
            playerRef = db.collection('scouting_players').doc(playerId);
            playerSnap = await playerRef.get();
        }
        if (!playerSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Player not found');
        }
        // 1. Upload to Storage
        const filePath = `${collectionName}/${playerId}/profile_photo_${Date.now()}.${mimeType.split('/')[1]}`;
        const file = bucket.file(filePath);
        await file.save(buffer, {
            metadata: { contentType: mimeType },
            public: true // Optional: Make the file public or use signed URL. Let's make it public for simplicity in display.
        });
        // Get Public URL
        // Method A: publicUrl() method (requires making it public)
        const publicUrl = file.publicUrl();
        // 2. Update Firestore
        await playerRef.update({
            photoUrl: publicUrl,
            photoUpdateDate: new Date().toISOString(),
            photoStatus: '✅',
            updatedAt: Date.now()
        });
        return { success: true, url: publicUrl };
    }
    catch (error) {
        logger.error("Error uploading photo", error);
        throw new https_1.HttpsError('internal', 'Upload failed');
    }
});
/**
 * Update Player Profile
 * Securely updates allowed fields (trajectory, palmares) after verifying PIN.
 */
exports.updatePlayerProfile = (0, https_1.onCall)({ cors: true }, async (request) => {
    const { playerId, pin, data } = request.data;
    if (!playerId || !pin || !data) {
        throw new https_1.HttpsError('invalid-argument', 'Missing parameters');
    }
    try {
        // 1. Verify credentials
        let playerRef = db.collection('players').doc(playerId);
        let playerSnap = await playerRef.get();
        if (!playerSnap.exists) {
            // Check scouting
            playerRef = db.collection('scouting_players').doc(playerId);
            playerSnap = await playerRef.get();
        }
        if (!playerSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Player not found');
        }
        const playerData = playerSnap.data();
        if ((playerData === null || playerData === void 0 ? void 0 : playerData.accessCode) !== pin) {
            throw new https_1.HttpsError('permission-denied', 'Invalid Access Code');
        }
        // 2. Filter allowed fields to prevent overwriting sensitive data
        const updates = {
            updatedAt: Date.now()
        };
        // Allowed: customFields (palmares, achievements)
        if (data.customFields) {
            if (data.customFields.palmares !== undefined)
                updates['customFields.palmares'] = data.customFields.palmares;
            if (data.customFields.achievements !== undefined)
                updates['customFields.achievements'] = data.customFields.achievements;
        }
        // Allowed: seasons (trajectory)
        if (data.seasons !== undefined) {
            updates['seasons'] = data.seasons;
        }
        // 3. Apply Update
        await playerRef.update(updates);
        return { success: true };
    }
    catch (error) {
        logger.error("Error updating profile", error);
        throw new https_1.HttpsError('internal', 'Update failed');
    }
});
const contractGenerator_1 = require("./contractGenerator");
Object.defineProperty(exports, "generateAndSignContract", { enumerable: true, get: function () { return contractGenerator_1.generateAndSignContract; } });
const notifications_1 = require("./notifications");
Object.defineProperty(exports, "checkDailyAlerts", { enumerable: true, get: function () { return notifications_1.checkDailyAlerts; } });
Object.defineProperty(exports, "onPlayerContractSigned", { enumerable: true, get: function () { return notifications_1.onPlayerContractSigned; } });
//# sourceMappingURL=index.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadPlayerPhoto = exports.getPublicPlayerProfile = void 0;
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
    const { playerId } = request.data;
    if (!playerId) {
        throw new https_1.HttpsError('invalid-argument', 'Player ID is required');
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
        // RETURN ONLY PUBLIC DATA
        // NO salaries, NO contracts, NO phone numbers
        return {
            id: playerDoc.id,
            firstName: (data === null || data === void 0 ? void 0 : data.firstName) || '',
            lastName1: (data === null || data === void 0 ? void 0 : data.lastName1) || '',
            name: (data === null || data === void 0 ? void 0 : data.name) || (data === null || data === void 0 ? void 0 : data.firstName) || 'Jugador',
            club: (data === null || data === void 0 ? void 0 : data.club) || '',
            category: (data === null || data === void 0 ? void 0 : data.category) || '',
            position: (data === null || data === void 0 ? void 0 : data.position) || '',
            photoUrl: (data === null || data === void 0 ? void 0 : data.photoUrl) || null,
            isScouting: isScouting
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
//# sourceMappingURL=index.js.map
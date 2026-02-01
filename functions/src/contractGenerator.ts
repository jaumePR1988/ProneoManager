import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';
import { addYears, format } from 'date-fns';


const storage = admin.storage();
const db = admin.firestore();

interface ContractData {
    playerId: string;
    signatureBase64: string; // Base64 data URL
    dni: string;
    address: {
        street: string;
        cp: string;
        city: string;
        province: string;
    };
    templateType: 'adult' | 'minor';
}

export const generateAndSignContract = onCall({ cors: true }, async (request) => {
    const { playerId, signatureBase64, dni, address, templateType } = request.data as ContractData;

    if (!playerId || !signatureBase64 || !dni || !address) {
        throw new HttpsError('invalid-argument', 'Missing required fields');
    }

    try {
        // 1. Get Player Data
        const playerDoc = await db.collection('players').doc(playerId).get();
        if (!playerDoc.exists) throw new HttpsError('not-found', 'Player not found');
        const playerData = playerDoc.data();
        const playerName = playerData?.name || 'Jugador';

        // 2. Load Template
        // WE WILL ASSUME A TEMPLATE EXISTS IN STORAGE for now, or use a blank one for testing if not found.
        // For local testing, ensure you have a file or handle the error gracefully.
        // 2. Load Template & Fonts
        const bucket = storage.bucket();
        const templatePath = `templates/contract_${templateType || 'adult'}.pdf`;

        // Check/Download Template
        const [exists] = await bucket.file(templatePath).exists();
        let pdfDoc;

        if (exists) {
            const [buffer] = await bucket.file(templatePath).download();
            pdfDoc = await PDFDocument.load(buffer);
        } else {
            pdfDoc = await PDFDocument.create();
            pdfDoc.addPage();
        }

        // Register Fontkit
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const fontkit = require('@pdf-lib/fontkit');
            pdfDoc.registerFontkit(fontkit);
        } catch (e) {
            console.warn("Fontkit registration failed:", e);
        }

        // Load Fonts from Storage
        let regularFont: any;
        let boldFont: any;

        try {
            const regFile = bucket.file('templates/calibri.ttf');
            const [regExists] = await regFile.exists();
            if (regExists) {
                const [regBuf] = await regFile.download();
                regularFont = await pdfDoc.embedFont(new Uint8Array(regBuf));
            } else {
                regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
            }

            const boldFile = bucket.file('templates/calibrib.ttf');
            const [boldExists] = await boldFile.exists();
            if (boldExists) {
                const [boldBuf] = await boldFile.download();
                boldFont = await pdfDoc.embedFont(new Uint8Array(boldBuf));
            } else {
                boldFont = regularFont; // Fallback to regular (or helvetica)
            }
        } catch (e) {
            console.warn("Font loading error, using Standard:", e);
            regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
            boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        }

        // ... (Signature setup skipped, assume consistent)

        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];

        // Process Signature Image
        // Remove header "data:image/png;base64,"
        const signatureImageBytes = Buffer.from(signatureBase64.split(',')[1], 'base64');
        const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
        const signatureDims = signatureImage.scale(0.5); // Doubled from 0.25

        // ...

        pages.forEach((page) => {
            // Lateral Signature (Left margin)
            page.drawImage(signatureImage, {
                x: 20,
                y: 100,
                width: signatureDims.width, // Removed * 0.5 factor to double effective size
                height: signatureDims.height,
                rotate: degrees(90)
            });
        });

        // ...

        // DRAW MAIN SIGNATURE
        // User requested larger size.
        const signatureDimsMain = signatureImage.scale(0.6); // Increased from 0.35 to 0.6 (~double)

        lastPage.drawImage(signatureImage, {
            x: 310, // Slight X adjustment
            y: 550,
            width: signatureDimsMain.width,
            height: signatureDimsMain.height,
        });

        // Draw Name & DNI under signature (Adjusted Y to account for larger signature)
        lastPage.drawText(`${playerName}`, { x: 320, y: 530, size: 10, font: boldFont });
        lastPage.drawText(`DNI: ${dni}`, { x: 320, y: 518, size: 10, font: regularFont });

        // Draw Dates
        const today = new Date();
        const endDate = addYears(today, 2);

        // 5. Save Result
        const pdfBytes = await pdfDoc.save();
        const fileName = `Contrato_Agencia_${format(today, 'yyyy')}.pdf`;
        const filePath = `players/${playerId}/documents/${fileName}`;

        await bucket.file(filePath).save(Buffer.from(pdfBytes), {
            metadata: { contentType: 'application/pdf' }
        });

        // Get Download URL
        const [url] = await bucket.file(filePath).getSignedUrl({
            action: 'read',
            expires: '03-01-2500' // Far future
        });

        // 6. Update Firestore
        await db.collection('players').doc(playerId).update({
            'proneo.agencyEndDate': format(endDate, 'yyyy-MM-dd'),
            'proneoStatus': 'PendingValidation', // Se requiere validación por administración
            documents: admin.firestore.FieldValue.arrayUnion({
                id: `contract_${Date.now()}`,
                name: 'Contrato Agencia (Renovado)',
                type: 'contract',
                url: url,
                date: new Date().toISOString()
            })
        });

        return { success: true, url, renewalDate: format(endDate, 'dd/MM/yyyy') };

    } catch (error) {
        console.error("Contract Error:", error);
        throw new HttpsError('internal', 'Failed to generate contract.');
    }
});

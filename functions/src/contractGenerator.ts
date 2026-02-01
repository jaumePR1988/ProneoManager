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
        const bucket = storage.bucket();
        const templatePath = `templates/contract_${templateType || 'adult'}.pdf`;
        const [exists] = await bucket.file(templatePath).exists();

        let pdfDoc;
        if (exists) {
            const [buffer] = await bucket.file(templatePath).download();
            pdfDoc = await PDFDocument.load(buffer);
        } else {
            // Fallback: Create new PDF if template missing (for testing)
            pdfDoc = await PDFDocument.create();
            pdfDoc.addPage();
        }

        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // Process Signature Image
        // Remove header "data:image/png;base64,"
        const signatureImageBytes = Buffer.from(signatureBase64.split(',')[1], 'base64');
        const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
        const signatureDims = signatureImage.scale(0.25); // Scale down

        // 3. Fill Fields & Sign (Iterate pages for side signature)
        const { width } = pages[0].getSize();

        pages.forEach((page, index) => {
            // Lateral Signature (Left margin)
            page.drawImage(signatureImage, {
                x: 20,
                y: 100, // Adjust vertical position
                width: signatureDims.width * 0.5,
                height: signatureDims.height * 0.5,
                rotate: degrees(90) // Vertical signature style? Or just small on side
            });
        });

        // 4. Last Page Details
        const lastPage = pages[pages.length - 1];

        // FILL FORM FIELDS IF THEY EXIST (AcroForms)
        const form = pdfDoc.getForm();
        try {
            const fields = form.getFields();
            if (fields.length > 0) {
                // Map data to fields
                const fieldMap: Record<string, string> = {
                    'nombre_jugador': playerName,
                    'dni': dni,
                    'calle': address.street,
                    'cp': address.cp,
                    'ciudad': address.city,
                    'provincia': address.province,
                    'fecha_firma': format(new Date(), 'dd/MM/yyyy'),
                };

                Object.entries(fieldMap).forEach(([key, val]) => {
                    try {
                        const field = form.getTextField(key);
                        if (field) field.setText(val);
                    } catch (e) {
                        // Field might not exist
                    }
                });
                form.flatten();
            }
        } catch (e) {
            console.log("No form fields found, skipping form fill");
        }

        // DRAW MAIN SIGNATURE (Assuming bottom right area roughly)
        lastPage.drawImage(signatureImage, {
            x: width - 150,
            y: 150,
            width: signatureDims.width,
            height: signatureDims.height,
        });

        // Draw Name & DNI under signature
        lastPage.drawText(`${playerName}`, { x: width - 150, y: 135, size: 10, font: boldFont });
        lastPage.drawText(`DNI: ${dni}`, { x: width - 150, y: 120, size: 10, font });

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
            'proneoStatus': 'Active', // Or whatever status logic you use
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

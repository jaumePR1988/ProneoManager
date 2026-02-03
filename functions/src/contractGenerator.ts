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
        const bucket = storage.bucket();
        const templatePath = `templates/contract_${templateType || 'adult'}.pdf`;

        // Check/Download Template
        const [exists] = await bucket.file(templatePath).exists();
        let pdfDoc;

        if (exists) {
            console.log("[DEBUG] Loading template from Storage...");
            const [buffer] = await bucket.file(templatePath).download();
            pdfDoc = await PDFDocument.load(buffer);
        } else {
            console.warn("[DEBUG] Template NOT found. Creating blank PDF.");
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

        // Load Fonts
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
                boldFont = regularFont;
            }
        } catch (e) {
            console.warn("Font loading error, using Standard:", e);
            regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
            boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        }

        const pages = pdfDoc.getPages();
        const lastPage = pages[pages.length - 1];

        // Process Signature Image
        // Remove header "data:image/png;base64,"
        const signatureImageBytes = Buffer.from(signatureBase64.split(',')[1], 'base64');
        const signatureImage = await pdfDoc.embedPng(signatureImageBytes);
        const signatureDims = signatureImage.scale(0.5);

        // Iterate all pages EXCEPT the last one for Lateral Signature
        for (let i = 0; i < pages.length - 1; i++) {
            const page = pages[i];
            page.drawImage(signatureImage, {
                x: 45,
                y: 100,
                width: signatureDims.width,
                height: signatureDims.height,
                rotate: degrees(90)
            });
        }

        // FILL FORM FIELDS IF THEY EXIST (AcroForms)
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        console.log(`[DEBUG] Found ${fields.length} fields in template.`);

        // --- DEBUG: LOG ALL FIELDS AND COORDINATES ---
        fields.forEach(f => {
            const name = f.getName();
            console.log(`[DEBUG] Field: ${name}`);
            try {
                const widgets = (f as any).getWidgets();
                if (widgets.length > 0) {
                    const rect = widgets[0].getRectangle();
                    console.log(`       -> Rect: x=${rect.x}, y=${rect.y}, w=${rect.width}, h=${rect.height}`);
                } else {
                    console.log(`       -> No widgets`);
                }
            } catch (err) {
                console.log(`       -> Error reading widgets:`, err);
            }
        });

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
                'fecha_nacimiento': playerData?.birthDate ? format(new Date(playerData.birthDate), 'dd/MM/yyyy') : '',
                'nacionalidad': playerData?.nationality || '',
            };

            Object.entries(fieldMap).forEach(([key, val]) => {
                try {
                    const field = form.getTextField(key);
                    if (field) {
                        let finalVal = val;
                        let fontToUse = regularFont;

                        if (key === 'nombre_jugador') {
                            finalVal = val.toUpperCase();
                            fontToUse = boldFont;
                        }

                        field.setText(finalVal);
                        try {
                            field.updateAppearances(fontToUse);
                        } catch (errStyle) {
                            console.warn("Style update failed for", key);
                        }
                    }
                } catch (e) {
                    // Field might not exist
                }
            });
            form.flatten();
        }

        // DRAW MAIN SIGNATURE (Last Page)
        const signatureDimsMain = signatureImage.scale(0.6);
        let sigX = 310;
        let sigY = 450;
        let sigWidth = signatureDimsMain.width;
        let sigHeight = signatureDimsMain.height;
        let hasCustomBox = false;

        try {
            const signatureField = form.getTextField('box_firma');
            if (signatureField) {
                console.log("Found box_firma field!");
                const widgets = (signatureField as any).getWidgets();
                if (widgets.length > 0) {
                    const rect = widgets[0].getRectangle();
                    console.log("Box Rect:", rect);
                    sigX = rect.x;
                    sigY = rect.y;

                    // Fit signature within the box maintaining aspect ratio
                    const boxRatio = rect.width / rect.height;
                    const sigRatio = signatureImage.width / signatureImage.height;

                    if (sigRatio > boxRatio) {
                        sigWidth = rect.width;
                        sigHeight = rect.width / sigRatio;
                    } else {
                        sigHeight = rect.height;
                        sigWidth = rect.height * sigRatio;
                    }

                    // Center in box
                    sigX += (rect.width - sigWidth) / 2;
                    sigY += (rect.height - sigHeight) / 2;

                    // MANUAL CORRECTION: Push down
                    sigY -= 120;

                    hasCustomBox = true;
                }
            } else {
                console.log("box_firma field not found (or flattened)");
            }
        } catch (e) {
            console.log("Error finding signature box:", e);
        }

        lastPage.drawImage(signatureImage, {
            x: sigX,
            y: sigY,
            width: sigWidth,
            height: sigHeight,
        });

        // Draw Name & DNI
        let textX = sigX;
        let textY = sigY - 20; // Default: below signature

        try {
            const dataField = form.getTextField('box_datos');
            if (dataField) {
                const widgets = (dataField as any).getWidgets();
                if (widgets.length > 0) {
                    const rect = widgets[0].getRectangle();
                    textX = rect.x;
                    textY = rect.y + rect.height - 10; // Start from top of box

                    // MANUAL CORRECTION: Push down
                    textY -= 120;
                }
            } else if (hasCustomBox) {
                // If we had a signature box but no data box, align text relative to it if possible
                // But since form is flattened, we might rely on the calculated sigX/sigY or original logic
                // For simplicity, using sigX/Y calculated above minus offsets
            }
        } catch (e) {
            // Ignore
        }

        // Draw Name & DNI text
        lastPage.drawText(`${playerName}`, { x: textX, y: textY, size: 10, font: boldFont });
        lastPage.drawText(`DNI: ${dni}`, { x: textX, y: textY - 12, size: 10, font: regularFont });

        // Draw Dates
        // (Optional: Draw specific date text if needed, relying on form fields above mostly)

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
            'proneoStatus': 'PendingValidation',
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

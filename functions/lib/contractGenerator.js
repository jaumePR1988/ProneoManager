"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAndSignContract = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const pdf_lib_1 = require("pdf-lib");
const date_fns_1 = require("date-fns");
const storage = admin.storage();
const db = admin.firestore();
exports.generateAndSignContract = (0, https_1.onCall)({ cors: true }, async (request) => {
    const { playerId, signatureBase64, dni, address, templateType } = request.data;
    if (!playerId || !signatureBase64 || !dni || !address) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required fields');
    }
    try {
        // 1. Get Player Data
        const playerDoc = await db.collection('players').doc(playerId).get();
        if (!playerDoc.exists)
            throw new https_1.HttpsError('not-found', 'Player not found');
        const playerData = playerDoc.data();
        const playerName = (playerData === null || playerData === void 0 ? void 0 : playerData.name) || 'Jugador';
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
            pdfDoc = await pdf_lib_1.PDFDocument.load(buffer);
        }
        else {
            pdfDoc = await pdf_lib_1.PDFDocument.create();
            pdfDoc.addPage();
        }
        // Register Fontkit
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const fontkit = require('@pdf-lib/fontkit');
            pdfDoc.registerFontkit(fontkit);
        }
        catch (e) {
            console.warn("Fontkit registration failed:", e);
        }
        // Load Fonts from Storage
        let regularFont;
        let boldFont;
        try {
            const regFile = bucket.file('templates/calibri.ttf');
            const [regExists] = await regFile.exists();
            if (regExists) {
                const [regBuf] = await regFile.download();
                regularFont = await pdfDoc.embedFont(new Uint8Array(regBuf));
            }
            else {
                regularFont = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
            }
            const boldFile = bucket.file('templates/calibrib.ttf');
            const [boldExists] = await boldFile.exists();
            if (boldExists) {
                const [boldBuf] = await boldFile.download();
                boldFont = await pdfDoc.embedFont(new Uint8Array(boldBuf));
            }
            else {
                boldFont = regularFont; // Fallback to regular (or helvetica)
            }
        }
        catch (e) {
            console.warn("Font loading error, using Standard:", e);
            regularFont = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
            boldFont = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
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
                width: signatureDims.width,
                height: signatureDims.height,
                rotate: (0, pdf_lib_1.degrees)(90)
            });
        });
        // ...
        // DRAW MAIN SIGNATURE
        // Strategy: Look for a form field named 'box_firma' to get exact coordinates.
        // If not found, use default coordinates.
        const signatureDimsMain = signatureImage.scale(0.6); // Keep for default scaling
        let sigX = 310;
        let sigY = 550;
        let sigWidth = signatureDimsMain.width;
        let sigHeight = signatureDimsMain.height;
        let hasCustomBox = false;
        try {
            const signatureField = form.getTextField('box_firma');
            if (signatureField) {
                const widgets = signatureField.getWidgets();
                if (widgets.length > 0) {
                    const rect = widgets[0].getRectangle();
                    sigX = rect.x;
                    sigY = rect.y;
                    // Fit signature within the box maintaining aspect ratio
                    const boxRatio = rect.width / rect.height;
                    const sigRatio = signatureImage.width / signatureImage.height;
                    if (sigRatio > boxRatio) {
                        // Limited by width
                        sigWidth = rect.width;
                        sigHeight = rect.width / sigRatio;
                    }
                    else {
                        // Limited by height
                        sigHeight = rect.height;
                        sigWidth = rect.height * sigRatio;
                    }
                    // Center in box
                    sigX += (rect.width - sigWidth) / 2;
                    sigY += (rect.height - sigHeight) / 2;
                    hasCustomBox = true;
                    // Remove the field appearance so it doesn't show a border/bg
                    signatureField.setText('');
                }
            }
        }
        catch (e) {
            console.log("No specific 'box_firma' field found, using defaults.");
        }
        lastPage.drawImage(signatureImage, {
            x: sigX,
            y: sigY,
            width: sigWidth,
            height: sigHeight,
        });
        // Draw Name & DNI
        // Strategy: Look for 'box_datos' or place relative to signature
        let textX = sigX;
        let textY = sigY - 20; // Default: below signature
        try {
            const dataField = form.getTextField('box_datos');
            if (dataField) {
                const widgets = dataField.getWidgets();
                if (widgets.length > 0) {
                    const rect = widgets[0].getRectangle();
                    textX = rect.x;
                    textY = rect.y + rect.height - 10; // Start from top of box
                }
            }
            else if (hasCustomBox) {
                // If we had a signature box but no data box, 
                // align text with the start of the signature box, below it
                const signatureField = form.getTextField('box_firma');
                const rect = signatureField.getWidgets()[0].getRectangle();
                textX = rect.x;
                textY = rect.y - 15;
            }
        }
        catch (e) {
            // Ignore
        }
        // Draw Name & DNI under signature
        lastPage.drawText(`${playerName}`, { x: textX, y: textY, size: 10, font: boldFont });
        lastPage.drawText(`DNI: ${dni}`, { x: textX, y: textY - 12, size: 10, font: regularFont });
        // Draw Dates
        const today = new Date();
        const endDate = (0, date_fns_1.addYears)(today, 2);
        // 5. Save Result
        const pdfBytes = await pdfDoc.save();
        const fileName = `Contrato_Agencia_${(0, date_fns_1.format)(today, 'yyyy')}.pdf`;
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
            'proneo.agencyEndDate': (0, date_fns_1.format)(endDate, 'yyyy-MM-dd'),
            'proneoStatus': 'PendingValidation',
            documents: admin.firestore.FieldValue.arrayUnion({
                id: `contract_${Date.now()}`,
                name: 'Contrato Agencia (Renovado)',
                type: 'contract',
                url: url,
                date: new Date().toISOString()
            })
        });
        return { success: true, url, renewalDate: (0, date_fns_1.format)(endDate, 'dd/MM/yyyy') };
    }
    catch (error) {
        console.error("Contract Error:", error);
        throw new https_1.HttpsError('internal', 'Failed to generate contract.');
    }
});
//# sourceMappingURL=contractGenerator.js.map
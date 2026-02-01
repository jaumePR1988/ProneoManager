
const { PDFDocument, StandardFonts } = require('pdf-lib');
const fs = require('fs');

async function testPdfFill() {
    try {
        console.log("Revisando archivo 'contract_adult.pdf'...");

        if (!fs.existsSync('./contract_adult.pdf')) {
            console.error("ERROR: No encuentro el archivo 'contract_adult.pdf' en esta carpeta.");
            return;
        }

        const pdfBytes = fs.readFileSync('./contract_adult.pdf');
        const pdfDoc = await PDFDocument.load(pdfBytes);

        // Font setup
        // Font setup
        let regularFont, boldFont;
        try {
            const fontkit = require('@pdf-lib/fontkit');
            pdfDoc.registerFontkit(fontkit);

            // Cargar Regular
            if (fs.existsSync('./calibri.ttf')) {
                const fontBytes = fs.readFileSync('./calibri.ttf');
                regularFont = await pdfDoc.embedFont(fontBytes);
            } else {
                regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
            }

            // Cargar Bold (si existe, si no usa regular)
            if (fs.existsSync('./calibrib.ttf')) {
                const fontBytes = fs.readFileSync('./calibrib.ttf');
                boldFont = await pdfDoc.embedFont(fontBytes);
            } else {
                console.log("⚠️ No encontré 'calibrib.ttf' (negrita). Usaré la normal.");
                boldFont = regularFont;
            }

        } catch (e) {
            regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
            boldFont = regularFont;
        }

        const form = pdfDoc.getForm();

        console.log("Formulario encontrado. Campos disponibles:");
        const fields = form.getFields();
        console.log(`DEBUG: Encontrados ${fields.length} campos.`);
        const names = fields.map(f => f.getName());
        names.forEach(n => console.log(` - '${n}'`));
        fs.writeFileSync('fields_found.log', `COUNT: ${fields.length}\n` + names.join('\n'));

        // Sample Data
        const fieldMap = {
            'nombre_jugador': 'JUAN PRUEBA TÉSTER', // Forced Uppercase for better look? Or keep distinct?
            'dni': '12345678Z',
            'calle': 'C/ Ejemplo de Prueba, 123',
            'cp': '08000',
            'ciudad': 'Barcelona',
            'provincia': 'Barcelona',
            'fecha_firma': '01/02/2026',
            'fecha_nacimiento': '15/05/2005',
            'nacionalidad': 'Española'
        };

        // Fill Fields
        console.log("\nRellenando campos (Nombre en NEGRITA y MAYÚSCULAS)...");
        Object.entries(fieldMap).forEach(([key, val]) => {
            try {
                const field = form.getTextField(key);
                if (field) {

                    let finalVal = val;
                    let fontToUse = regularFont;

                    // Logica especial para NOMBRE
                    if (key === 'nombre_jugador') {
                        finalVal = val.toUpperCase();
                        fontToUse = boldFont;
                    }

                    field.setText(finalVal);
                    try {
                        field.updateAppearances(fontToUse);
                    } catch (errStyle) {
                        console.log("Warnging style:", errStyle.message);
                    }
                    console.log(`✅ Campo '${key}' rellenado.`);
                } else {
                    console.warn(`⚠️ Campo '${key}' NO encontrado en el PDF.`);
                }
            } catch (e) {
                // Ignore
            }
        });

        form.flatten();

        const pdfOut = await pdfDoc.save();
        fs.writeFileSync('./contract_test_output.pdf', pdfOut);

        console.log("\n✅ ÉXITO: Archivo generado 'contract_test_output.pdf'. Ábrelo para comprobar.");

    } catch (err) {
        console.error("Error crítico:", err);
    }
}

testPdfFill();

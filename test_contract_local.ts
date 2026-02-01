
import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';

async function testPdfFill() {
    try {
        console.log("Revisando archivo 'contract_adult.pdf'...");

        if (!fs.existsSync('./contract_adult.pdf')) {
            console.error("ERROR: No encuentro el archivo 'contract_adult.pdf' en esta carpeta.");
            return;
        }

        const pdfBytes = fs.readFileSync('./contract_adult.pdf');
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();

        console.log("Formulario encontrado. Campos disponibles:");
        const fields = form.getFields();
        fields.forEach(f => console.log(` - ${f.getName()}`));

        // Sample Data
        const fieldMap: Record<string, string> = {
            'nombre_jugador': 'Juan Prueba Téster',
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
        console.log("\nRellenando campos...");
        Object.entries(fieldMap).forEach(([key, val]) => {
            try {
                const field = form.getTextField(key);
                if (field) {
                    field.setText(val);
                    console.log(`✅ Campo '${key}' rellenado.`);
                } else {
                    console.warn(`⚠️ Campo '${key}' NO encontrado en el PDF.`);
                }
            } catch (e) {
                console.warn(`⚠️ Error intentando rellenar '${key}':`, e);
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

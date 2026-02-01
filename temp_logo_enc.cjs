const fs = require('fs');
const path = require('path');

// Reverting to logo-pdf.jpg for the final high-quality output
// Using __dirname to be safe
const inputPath = path.join(__dirname, 'public', 'logo-pdf.jpg');
const outputPath = path.join(__dirname, 'src', 'utils', 'logoBase64.ts');

console.log('Script __dirname:', __dirname);
console.log('Attempting to read from:', inputPath);

try {
    if (!fs.existsSync(inputPath)) {
        throw new Error(`Input file not found: ${inputPath}`);
    }

    const fileBuffer = fs.readFileSync(inputPath);
    console.log(`Buffer length: ${fileBuffer.length}`);

    const base64String = fileBuffer.toString('base64');
    console.log(`Base64 string length: ${base64String.length}`);

    // If buffer is empty, abort
    if (fileBuffer.length === 0) {
        throw new Error("File buffer is empty!");
    }

    // JPEG mime type
    const content = `// This file is auto-generated.\nexport const LOGO_BASE64 = 'data:image/jpeg;base64,${base64String}';\n`;

    fs.writeFileSync(outputPath, content, 'utf8');

    console.log(`SUCCESS: Wrote ${outputPath}. Final File Size: ${content.length} bytes.`);
} catch (err) {
    console.error('FAILURE:', err);
    process.exit(1);
}

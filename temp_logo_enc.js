const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'public', 'logo-premium-final.jpg');
const outputPath = path.join(__dirname, 'src', 'utils', 'logoBase64.ts');

try {
    const fileBuffer = fs.readFileSync(inputPath);
    const base64String = fileBuffer.toString('base64');

    const content = `// This file is auto-generated. Do not edit manually.\nexport const LOGO_BASE64 = 'data:image/jpeg;base64,${base64String}';\n`;

    fs.writeFileSync(outputPath, content, 'utf8');

    console.log(`Successfully wrote ${outputPath}. Length: ${content.length}`);
} catch (err) {
    console.error('Error generating logo base64:', err);
    process.exit(1);
}

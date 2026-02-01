import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Player } from '../types/player';
import { getCountryFlagUrl } from './countries';
import { LOGO_BASE64 } from './logoBase64';

const imageUrlToBase64 = async (url: string): Promise<string> => {
    // Helper to load image via HTML Image Element (Canvas method)
    const loadImage = (src: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous'; // Try to request CORS permission
            img.onload = () => {
                // Create a SQUARE canvas based on the smallest dimension
                const size = Math.min(img.width, img.height);
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context failed'));
                    return;
                }

                // 1. Clip to Circle
                ctx.beginPath();
                ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();

                // 2. Draw Image (Center Crop / Aspect Fill)
                // Source rectangle:
                const sx = (img.width - size) / 2;
                const sy = (img.height - size) / 2;

                ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);

                try {
                    // distinct: PNG to preserve transparency (circular corners)
                    const dataURL = canvas.toDataURL('image/png');
                    resolve(dataURL);
                } catch (err) {
                    reject(err);
                }
            };
            img.onerror = (e) => reject(new Error('Image load error'));
            img.src = src;
        });
    };

    try {
        // 1. Try Direct Load
        // Check if it's already a data URL
        if (url.startsWith('data:')) return url;

        return await loadImage(url);
    } catch (directError) {
        console.warn("[PDF] Direct image load failed, trying proxy...", directError);

        // 2. Fallback to Proxy (wsrv.nl)
        // If direct CORS failed, the proxy might handle the remote fetch and serve it back with generic CORS headers.
        try {
            const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=png`;
            return await loadImage(proxyUrl);
        } catch (proxyError) {
            console.error("[PDF] All image load attempts failed", proxyError);
            throw proxyError;
        }
    }
};

// Precise Age Helper
const calculateAge = (birthDateString: string): string => {
    if (!birthDateString) return '—';
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age.toString();
};

export const generatePlayerDossier = async (player: Player) => {
    console.log("[PDF] Starting Dossier Generation for:", player.firstName);

    const photoPromise = player.photoUrl
        ? imageUrlToBase64(player.photoUrl).catch(e => {
            console.error("[PDF] Profile Photo load failed", e);
            return null;
        })
        : Promise.resolve(null);

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Sleek Compact Header - BLACK
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Green sub-bar
    doc.setFillColor(180, 200, 133); // #b4c885
    doc.rect(0, 40, pageWidth, 1.5, 'F');

    // 2. NAME
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text((player.firstName || '').toUpperCase(), 195, 18, { align: 'right' });

    doc.setFontSize(26);
    doc.setTextColor(180, 200, 133);
    doc.text((player.lastName1 || '').toUpperCase(), 195, 30, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    const categoryText = player.category ? player.category.toUpperCase() : '';
    doc.text(`${categoryText} DOSSIER PRO • PRONEO SPORTS`, 195, 36, { align: 'right' });

    // 3. MAIN CONTENT AREA
    const mainY = 55;

    // --- LOGO LOGIC (Top Left) ---
    if (LOGO_BASE64) {
        try {
            // Render logo without clipping
            doc.addImage(LOGO_BASE64, 'JPEG', 12, 7, 26, 26);
        } catch (e) {
            console.error("[PDF] Logo error", e);
        }
    }

    // Player Photo (Circular)
    const photoData = await photoPromise;

    if (photoData) {
        try {
            // New Logic: The custom loader returns a CIRCULAR PNG
            // So we just draw it. No PDF clipping needed.

            // Draw a subtle border circle behind it
            doc.setDrawColor(220, 220, 220);
            doc.setLineWidth(0.5);
            doc.circle(42, mainY + 28, 28, 'S');

            // Draw the pre-clipped image
            doc.addImage(photoData, 'PNG', 14, mainY, 56, 56);

        } catch (e) {
            console.error("[PDF] Error rendering photo:", e);
        }
    } else if (player.photoUrl) {
        doc.setFillColor(240, 240, 240);
        doc.circle(42, mainY + 28, 28, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('SIN FOTO', 42, mainY + 28, { align: 'center' });
    }

    // --- CURRENT CLUB (Priority: player.club > seasons[0].club) ---
    const infoX = 85;
    const currentClub = (player.club || player.seasons?.[0]?.club || 'SIN EQUIPO ACTUAL').toUpperCase();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(113, 113, 122);
    doc.text('EQUIPO ACTUAL', infoX, mainY + 5);

    doc.setFontSize(15);
    doc.setTextColor(24, 24, 27);
    doc.text(currentClub, infoX, mainY + 13);

    doc.setDrawColor(244, 244, 245);
    doc.setLineWidth(0.2);
    doc.line(infoX, mainY + 18, pageWidth - 15, mainY + 18);

    // Data Grid
    // PRECISE AGE CALCULATION
    const age = calculateAge(player.birthDate);

    // INTERNATIONALITY
    // Use player.selection directly, default to 'NO' if empty
    const internationality = (player.selection && player.selection !== 'No internacional')
        ? player.selection.toUpperCase()
        : 'NO';

    const specs = [
        { l: 'POSICIÓN PRINCIPAL', v: (player.position || '—').toUpperCase() },
        { l: 'EDAD', v: `${age} AÑOS` },
        { l: 'PIERNA HÁBIL', v: (player.preferredFoot === 'Izquierda' ? 'ZURDA' : 'DIESTRA') },
        { l: 'INTERNACIONALIDAD', v: internationality }
    ];

    let gridY = mainY + 28;
    specs.forEach((s, i) => {
        const x = i % 2 === 0 ? infoX : infoX + 55;
        const y = gridY + (Math.floor(i / 2) * 16);

        doc.setFontSize(7);
        doc.setTextColor(161, 161, 170);
        doc.text(s.l, x, y);

        doc.setFontSize(10);
        doc.setTextColor(24, 24, 27);
        doc.text(s.v, x, y + 5);
    });

    // Flag
    try {
        const flagUrl = getCountryFlagUrl(player.nationality);
        // Force proxy for flag too
        const proxyFlag = `https://wsrv.nl/?url=${encodeURIComponent(flagUrl)}&output=png`;
        const flagBase64 = await imageUrlToBase64(proxyFlag).catch(() => null);
        if (flagBase64) {
            doc.addImage(flagBase64, 'PNG', infoX, mainY + 68, 6, 4);
        }
        doc.setFontSize(10);
        doc.setTextColor(24, 24, 27);
        doc.text((player.nationality || '').toUpperCase(), infoX + 8, mainY + 71.3);
    } catch (e) {
        doc.setFontSize(10);
        doc.setTextColor(24, 24, 27);
        doc.text((player.nationality || '').toUpperCase(), infoX, mainY + 71.3);
    }

    // PALMARES
    let palmaresY = mainY + 85;
    doc.setFontSize(13);
    doc.setTextColor(24, 24, 27);
    doc.setFont('helvetica', 'bold');
    doc.text('PALMARÉS Y LOGROS RECIENTES', 15, palmaresY);

    doc.setDrawColor(180, 200, 133);
    doc.setLineWidth(1);
    doc.line(15, palmaresY + 2, 35, palmaresY + 2);

    const palmares = Array.isArray(player.customFields?.palmares)
        ? player.customFields.palmares
        : player.customFields?.palmares ? [player.customFields.palmares] : [];

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    let pY = palmaresY + 12;

    if (palmares.length > 0) {
        palmares.forEach(p => {
            doc.setFillColor(252, 252, 252);
            doc.roundedRect(15, pY - 5, pageWidth - 30, 9, 1, 1, 'F');
            doc.setFillColor(180, 200, 133);
            doc.rect(15, pY - 5, 1.2, 9, 'F');
            doc.setTextColor(63, 63, 70);
            doc.text(p, 20, pY + 1.2);
            pY += 12;
        });
    } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(161, 161, 170);
        doc.text('Sin registros de palmarés destacados.', 15, pY);
        pY += 12;
    }

    // TABLE
    let tableY = pY + 8;
    doc.setFontSize(13);
    doc.setTextColor(24, 24, 27);
    doc.setFont('helvetica', 'bold');
    doc.text('HISTORIAL DE COMPETICIÓN', 15, tableY);
    doc.line(15, tableY + 2, 35, tableY + 2);

    const seasons = player.seasons || [];
    const rows = seasons.map(s => [
        (s.season || '—').toString(),
        (s.club || '—').toUpperCase(),
        (s.division || '—').toUpperCase()
    ]);

    autoTable(doc, {
        startY: tableY + 8,
        head: [['AÑO / TEMPORADA', 'CLUB / EQUIPO', 'CATEGORÍA / DIVISIÓN']],
        body: rows,
        theme: 'plain',
        styles: { fontSize: 8.5, cellPadding: 4, fontStyle: 'bold', textColor: [39, 39, 42] },
        headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 1: { textColor: [180, 200, 133] } },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        margin: { left: 15, right: 15 }
    });

    // FOOTER
    doc.setFillColor(24, 24, 27);
    doc.rect(0, 282, pageWidth, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text('PRONEO SPORTS MANAGEMENT • WWW.PRONEOSPORTS.COM', pageWidth / 2, 291, { align: 'center' });

    doc.save(`DOSSIER_PRO_${player.firstName}_${player.lastName1}.pdf`);
};

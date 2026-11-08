// ประกอบหน้าไดอารี่การ์ตูนฉบับสมบูรณ์ด้วยโค้ด (ไม่พึ่ง AI วาดตัวหนังสือ)
// AI มีหน้าที่วาดแค่ "ภาพประกอบ" แต่ละช่องเท่านั้น — หัวข้อ/วันที่/เลขช่อง/บอลลูนคำพูด/สรุป มาแปะทีหลังตรงนี้
// เพื่อการันตีว่าตัวหนังสือไทยอ่านออกชัดเจนทุกครั้ง (โมเดลวาดภาพ AI เขียนตัวหนังสือแม่นๆ ไม่ได้)

const { createCanvas, loadImage } = require('canvas');

const FONT_STACK = '"Segoe UI", "Tahoma", "Leelawadee UI", sans-serif';

// ----- รูปทรงพื้นฐานที่วาดเอง (กันปัญหา emoji/font ไม่รองรับสัญลักษณ์บางตัว) -----

function drawHeart(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    const top = size * 0.3;
    ctx.moveTo(cx, cy + top);
    ctx.bezierCurveTo(cx, cy, cx - size / 2, cy, cx - size / 2, cy + top);
    ctx.bezierCurveTo(cx - size / 2, cy + (size + top) / 2, cx, cy + (size + top) / 2, cx, cy + size);
    ctx.bezierCurveTo(cx, cy + (size + top) / 2, cx + size / 2, cy + (size + top) / 2, cx + size / 2, cy + top);
    ctx.bezierCurveTo(cx + size / 2, cy, cx, cy, cx, cy + top);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawStar(ctx, cx, cy, outerR, innerR, points, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    const step = Math.PI / points;
    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = i * step - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// ตัดบรรทัดข้อความให้พอดีความกว้างที่กำหนด รองรับภาษาไทยที่อาจไม่มีช่องว่างในคำ
function wrapText(ctx, text, maxWidth) {
    const words = String(text || '').split(' ');
    const lines = [];
    let currentLine = '';

    const splitLongChunk = (chunk) => {
        if (ctx.measureText(chunk).width <= maxWidth) return [chunk];
        const parts = [];
        let buf = '';
        for (const ch of chunk) {
            const test = buf + ch;
            if (ctx.measureText(test).width > maxWidth && buf) {
                parts.push(buf);
                buf = ch;
            } else {
                buf = test;
            }
        }
        if (buf) parts.push(buf);
        return parts;
    };

    for (const word of words) {
        const test = currentLine ? currentLine + ' ' + word : word;
        if (ctx.measureText(test).width <= maxWidth) {
            currentLine = test;
        } else {
            if (currentLine) lines.push(currentLine);
            const chunks = splitLongChunk(word);
            for (let i = 0; i < chunks.length - 1; i++) lines.push(chunks[i]);
            currentLine = chunks[chunks.length - 1] || '';
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
}

function drawSpeechBubble(ctx, x, y, w, h, text, fontSize) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    roundRectPath(ctx, x, y, w, h, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#222';
    ctx.font = `${fontSize}px ${FONT_STACK}`;
    ctx.textBaseline = 'top';
    const padding = 14;
    const lines = wrapText(ctx, text, w - padding * 2);
    const lineHeight = fontSize * 1.35;
    const totalTextHeight = lines.length * lineHeight;
    let startY = y + Math.max(padding, (h - totalTextHeight) / 2);
    for (const line of lines) {
        const lineWidth = ctx.measureText(line).width;
        ctx.fillText(line, x + (w - lineWidth) / 2, startY);
        startY += lineHeight;
    }
    ctx.restore();
}

// วาดรูปให้เต็มกรอบแบบ "cover" (ครอปส่วนเกิน ไม่ยืดภาพผิดสัดส่วน)
function drawCoverImage(ctx, img, x, y, w, h) {
    const imgRatio = img.width / img.height;
    const boxRatio = w / h;
    let sx, sy, sw, sh;
    if (imgRatio > boxRatio) {
        sh = img.height;
        sw = sh * boxRatio;
        sx = (img.width - sw) / 2;
        sy = 0;
    } else {
        sw = img.width;
        sh = sw / boxRatio;
        sx = 0;
        sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/**
 * ประกอบหน้าไดอารี่การ์ตูนฉบับสมบูรณ์
 * @param {Buffer[]} panelImages - รูปแต่ละช่องที่ AI วาดมา (ไม่มีตัวหนังสือ)
 * @param {string[]} captions - บทพูดภาษาไทยของแต่ละช่อง (เรียงตรงกับ panelImages)
 * @param {string} summary - ข้อความสรุปท้ายหน้าภาษาไทย
 * @param {string} dateText - วันที่ภาษาไทยที่แสดงหัวหน้า
 * @returns {Promise<Buffer>} รูป JPEG ของหน้าไดอารี่ที่ประกอบเสร็จแล้ว
 */
async function composeDiaryPage({ panelImages, captions, summary, dateText }) {
    const n = panelImages.length;
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);

    const PANEL_W = 560;
    const PANEL_H = 700;
    const GAP = 24;
    const MARGIN = 40;
    const TITLE_H = 150;
    const SUMMARY_H = 110;

    const canvasW = MARGIN * 2 + cols * PANEL_W + (cols - 1) * GAP;
    const canvasH = TITLE_H + rows * PANEL_H + (rows - 1) * GAP + SUMMARY_H;

    const canvas = createCanvas(canvasW, canvasH);
    const ctx = canvas.getContext('2d');

    // พื้นหลังกระดาษขาว (โทนขาวดำแบบมังงะพิมพ์จริง)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // --- หัวข้อ ---
    ctx.fillStyle = '#1a1a1a';
    ctx.font = `bold 52px ${FONT_STACK}`;
    ctx.textBaseline = 'alphabetic';
    const title = 'ไดอารี่ของฉัน';
    const titleWidth = ctx.measureText(title).width;
    const titleX = MARGIN + 50;
    const titleY = 78;
    ctx.fillText(title, titleX, titleY);
    drawHeart(ctx, titleX - 32, titleY - 20, 26, '#1a1a1a');
    drawHeart(ctx, titleX + titleWidth + 32, titleY - 20, 26, '#1a1a1a');

    // วันที่ (มุมขวาบน)
    ctx.fillStyle = '#1a1a1a';
    ctx.font = `bold 26px ${FONT_STACK}`;
    const dateStr = `วันที่ ${dateText || ''}`;
    const dateWidth = ctx.measureText(dateStr).width;
    ctx.fillText(dateStr, canvasW - MARGIN - dateWidth, 60);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvasW - MARGIN - dateWidth, 72);
    ctx.lineTo(canvasW - MARGIN, 72);
    ctx.stroke();

    // --- ช่องการ์ตูนแต่ละช่อง ---
    for (let i = 0; i < n; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = MARGIN + col * (PANEL_W + GAP);
        const y = TITLE_H + row * (PANEL_H + GAP);

        const img = await loadImage(panelImages[i]);

        ctx.save();
        roundRectPath(ctx, x, y, PANEL_W, PANEL_H, 16);
        ctx.clip();
        drawCoverImage(ctx, img, x, y, PANEL_W, PANEL_H);
        ctx.restore();

        // กรอบช่อง
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 4;
        roundRectPath(ctx, x, y, PANEL_W, PANEL_H, 16);
        ctx.stroke();

        // เลขช่อง (วงกลมมุมซ้ายบน)
        const badgeR = 24;
        const badgeCx = x + badgeR + 12;
        const badgeCy = y + badgeR + 12;
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(badgeCx, badgeCy, badgeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = `bold 26px ${FONT_STACK}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), badgeCx, badgeCy + 1);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        // บอลลูนคำพูด
        const bubbleW = PANEL_W - 60;
        const bubbleX = x + (PANEL_W - bubbleW) / 2;
        const bubbleY = y + 60;
        const bubbleH = 130;
        drawSpeechBubble(ctx, bubbleX, bubbleY, bubbleW, bubbleH, captions[i] || '', 24);
    }

    // --- สรุปท้ายหน้า ---
    const summaryY = TITLE_H + rows * PANEL_H + (rows - 1) * GAP + 30;
    ctx.fillStyle = '#1a1a1a';
    ctx.font = `bold 26px ${FONT_STACK}`;
    ctx.textBaseline = 'top';
    const summaryText = `สรุป: ${summary || ''}`;
    const maxSummaryWidth = canvasW - MARGIN * 2 - 50;
    const summaryLines = wrapText(ctx, summaryText, maxSummaryWidth);
    let sy = summaryY;
    for (const line of summaryLines) {
        const lw = ctx.measureText(line).width;
        ctx.fillText(line, (canvasW - lw) / 2, sy);
        sy += 34;
    }
    drawStar(ctx, MARGIN + 15, summaryY + 14, 16, 7, 5, '#1a1a1a');

    return canvas.toBuffer('image/jpeg', { quality: 0.93 });
}

module.exports = { composeDiaryPage };

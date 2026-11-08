require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { composeDiaryPage } = require('./imageCompose');

const app = express();

app.use(cors());
app.use(express.json());

// 0. ตั้งค่าโฟลเดอร์เก็บรูปภาพ
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// 1. ตั้งค่าการเชื่อมต่อฐานข้อมูล MySQL
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'manga5',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('เชื่อมต่อ MySQL ไม่สำเร็จ:', err);
    } else {
        console.log('เชื่อมต่อ MySQL Pool ฐานข้อมูล manga5 สำเร็จแล้ว!');
        connection.release();
    }
});

// อ่าน GEMINI_API_KEY จาก .env
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// ❗️ IP ปัจจุบันของคุณ
const SERVER_IP = '192.168.0.148';
const IMAGE_MODEL = 'gemini-3.1-flash-lite-image';

const CHARACTER_REFERENCES = {
    doraemon: `A round Japanese black-and-white manga cartoon cat character (in the style of Doraemon manga line art) — bold clean black ink outlines, simple black and white shading, no color. Large plain white round face and belly patch, big round eyes with a small white highlight dot, small solid black nose, whisker lines on each cheek, cheerful expression, wearing a collar around the neck with a small round bell hanging from it.`,
};

// ---------------------------------------------------------
// 🚀 Route 0: get-or-create user จาก firebase_uid
// ---------------------------------------------------------
app.post('/api/users/sync', (req, res) => {
    const { firebase_uid, username, email } = req.body;

    if (!firebase_uid) {
        return res.status(400).json({ error: 'ต้องมี firebase_uid' });
    }

    const sqlFind = "SELECT user_id FROM users WHERE firebase_uid = ?";
    db.query(sqlFind, [firebase_uid], (err, rows) => {
        if (err) {
            console.error("MySQL Error (users sync - find):", err);
            return res.status(500).json({ error: "ดึงข้อมูลผู้ใช้ไม่สำเร็จ" });
        }

        if (rows.length > 0) {
            return res.json({ success: true, user_id: rows[0].user_id });
        }

        const emailValue = (email && email.trim()) ? email.trim() : `${firebase_uid}@firebase.local`;
        const sqlInsert = "INSERT INTO users (firebase_uid, username, email, password) VALUES (?, ?, ?, ?)";
        db.query(sqlInsert, [firebase_uid, username || 'ผู้ใช้', emailValue, 'firebase_auth'], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return db.query(sqlFind, [firebase_uid], (err2, rows2) => {
                        if (err2 || rows2.length === 0) {
                            console.error("MySQL Error (users sync - insert):", err);
                            return res.status(500).json({ error: "สร้างผู้ใช้ไม่สำเร็จ" });
                        }
                        res.json({ success: true, user_id: rows2[0].user_id });
                    });
                }
                console.error("MySQL Error (users sync - insert):", err);
                return res.status(500).json({ error: "สร้างผู้ใช้ไม่สำเร็จ" });
            }
            res.json({ success: true, user_id: result.insertId });
        });
    });
});

// ---------------------------------------------------------
// 🚀 Route 0.1: อัปเดตชื่อผู้ใช้งาน (Profile Username)
// ---------------------------------------------------------
app.put('/api/users/update-username', (req, res) => {
    const { firebase_uid, username } = req.body;

    if (!firebase_uid || !username) {
        return res.status(400).json({ error: 'ต้องมี firebase_uid และ username' });
    }

    const sql = "UPDATE users SET username = ? WHERE firebase_uid = ?";
    db.query(sql, [username.trim(), firebase_uid], (err, result) => {
        if (err) {
            console.error("MySQL Error (update username):", err);
            return res.status(500).json({ error: "อัปเดตชื่อไม่สำเร็จ" });
        }
        res.json({ success: true, message: "อัปเดตชื่อเรียบร้อยแล้ว" });
    });
});

// ---------------------------------------------------------
// 🚀 Route 1: สำหรับรับข้อมูลจากแอปมาสร้างรูปภาพและสร้างโพสต์ (หน้า Create)
// ---------------------------------------------------------
app.post('/api/generate-diary', async (req, res) => {
    const { firebase_uid, user_id, diary_text, layout, art_style } = req.body;
    const numPanels = parseInt(layout, 10) || 4;

    try {
        const todayThai = new Date().toLocaleDateString('th-TH-u-ca-buddhist', { day: 'numeric', month: 'long', year: 'numeric' });

        const styleKey = (art_style || '').toLowerCase().replace(/[^a-z0-9ก-๙]/g, '');
        const knownCharacter = CHARACTER_REFERENCES[styleKey];
        const characterNote = knownCharacter
            ? knownCharacter
            : `The main character should look like the well-known character/style "${art_style}" — draw their iconic, instantly recognizable visual features (body shape, face, hair, outfit, accessories) in black-and-white manga line art.`;

        const splitInstruction = `Split this Thai diary entry into exactly ${numPanels} short story beats for a ${numPanels}-panel comic page, then write a one-sentence Thai summary.

Diary (Thai): "${diary_text}"

Respond with ONLY valid JSON (no markdown code fences, no extra text) in this exact shape:
{"panels": [{"scene_en": "short English visual scene description of what is happening in this panel — setting, action, expression only, never mention any text/writing/speech bubbles", "caption_th": "short natural Thai sentence (max ~12 words) for this panel's speech/thought bubble"}], "summary_th": "one short Thai sentence summarizing the whole entry"}

The "panels" array must have exactly ${numPanels} items, in chronological order.`;

        let diaryData = null;
        let geminiRetryCount = 5;

        for (let i = 0; i < geminiRetryCount; i++) {
            try {
                // แสดงสถานะการทำงานและรอบที่กำลังพยายามเรียกใช้งาน API
                console.log(`1. กำลังแยกฉาก+แต่งบทพูดด้วย Gemini... (พยายามครั้งที่ ${i + 1}/${geminiRetryCount})`);

                // ยิง HTTP POST Request ไปยัง Gemini API พร้อมส่งชุดคำสั่ง splitInstruction
                const textResponse = await axios.post(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`,
                    { contents: [{ parts: [{ text: splitInstruction }] }] }
                );

                // ดึงข้อความผลลัพธ์จากคำตอบของ API และตัดช่องว่างหัว-ท้ายออก
                let rawText = textResponse.data.candidates[0].content.parts[0].text.trim();

                // ทำความสะอาดข้อความ ตัดสัญลักษณ์ Markdown Code Block (เช่น ```json หรือ ```) ออก หาก AI เผลอใส่ติดมา
                rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/, '');

                // แปลงข้อความสตริง JSON ให้กลายเป็น JavaScript Object
                diaryData = JSON.parse(rawText);

                // ตรวจสอบความถูกต้องของข้อมูล: ต้องมีอาร์เรย์ panels และต้องไม่เป็นอาร์เรย์ว่าง
                if (!Array.isArray(diaryData.panels) || diaryData.panels.length === 0) {
                    throw new Error('Gemini คืนโครงสร้าง JSON ไม่ถูกต้อง');
                }

                // หากได้ข้อมูลถูกต้องตามเงื่อนไข สั่งออกจากลูปการลองใหม่ (Retry Loop) ทันที
                break;

            } catch (err) {
                // หากล้มเหลวจนถึงรอบสุดท้ายตามที่กำหนด ให้ระบุขั้นตอนและปล่อย Error ออกไปให้ระบบหลักจัดการ
                if (i === geminiRetryCount - 1) {
                    err.stage = 'ขั้นตอนที่ 1: Gemini (แยกฉาก)';
                    throw err;
                }

                // คำนวณเวลาหยุดพักแบบเพิ่มขึ้นเป็นเท่าตัว (Exponential Backoff: 5 วินาที, 10 วินาที, 20 วินาที, ...)
                const waitMs = 5000 * Math.pow(2, i);

                // แสดงข้อความแจ้งเตือนข้อผิดพลาดชั่วคราว พร้อมระบุรหัส HTTP Status และเวลาที่จะรอ
                console.log(`   [ระบบป้องกัน] Gemini ผิดพลาดชั่วคราว (HTTP ${err.response?.status ?? '?'}) หยุดพัก ${waitMs / 1000} วินาทีแล้วจะลองใหม่...`);

                // หน่วงเวลาหยุดพักตามที่คำนวณไว้ ก่อนจะวนลูปเพื่อเริ่มพยายามใหม่ในรอบถัดไป
                await new Promise(resolve => setTimeout(resolve, waitMs));
            }
        }

        console.log("2. กำลังวาดภาพแต่ละช่อง...");
        const panelImages = [];

        for (let p = 0; p < diaryData.panels.length; p++) {
            const scene = diaryData.panels[p].scene_en || '';
            const panelPrompt = `${characterNote} Scene: ${scene}. Black-and-white Japanese manga illustration style, bold clean black ink outlines, simple black and white shading, no color, single character portrait/scene, no panel borders, consistent character design matching this exact description: ${characterNote} ABSOLUTELY NO text, NO words, NO letters, NO speech bubbles, NO writing anywhere in the image.`;

            let panelBuffer = null;
            let retryCount = 3;

            for (let i = 0; i < retryCount; i++) {
                try {
                    console.log(`   ช่องที่ ${p + 1}/${diaryData.panels.length} (พยายามครั้งที่ ${i + 1}/${retryCount})`);

                    // ✅ แก้ไข URL ให้เป็น String ข้อความธรรมดาแล้ว
                    const imageResponse = await axios.post(
                        'https://generativelanguage.googleapis.com/v1beta/interactions',
                        {
                            model: IMAGE_MODEL,
                            input: [{ type: 'text', text: panelPrompt }],
                            response_format: { type: 'image', aspect_ratio: '4:5' },
                        },
                        {
                            headers: { 'x-goog-api-key': GEMINI_API_KEY, 'Content-Type': 'application/json' },
                            timeout: 120000,
                        }
                    );

                    const imgBlock = (imageResponse.data.steps || [])
                        .filter(s => s.type === 'model_output')
                        .flatMap(s => s.content || [])
                        .find(c => c.type === 'image');

                    if (!imgBlock?.data) {
                        throw new Error('ไม่พบข้อมูลภาพใน response');
                    }

                    panelBuffer = Buffer.from(imgBlock.data, 'base64');
                    break;
                } catch (err) {
                    if (i === retryCount - 1) {
                        err.stage = `ขั้นตอนที่ 2: Gemini Image (วาดช่องที่ ${p + 1})`;
                        throw err;
                    }
                    const isQuotaOrBusy = err.response?.status === 429 || err.response?.status === 503;
                    const waitMs = isQuotaOrBusy ? 10000 : 3000;
                    console.log(`     เซิร์ฟเวอร์รูปภาพขัดข้องชั่วคราว (HTTP ${err.response?.status ?? '?'}) หยุดพัก ${waitMs / 1000} วินาทีแล้วจะลองใหม่...`);
                    await new Promise(resolve => setTimeout(resolve, waitMs));
                }
            }
            panelImages.push(panelBuffer);

            if (p < diaryData.panels.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
        }

        console.log("3. กำลังประกอบหน้าไดอารี่...");
        const finalBuffer = await composeDiaryPage({
            panelImages,
            captions: diaryData.panels.map(p => p.caption_th),
            summary: diaryData.summary_th,
            dateText: todayThai,
        });

        console.log("4. กำลังเซฟรูปลงในคอมพิวเตอร์...");
        const fileName = `manga_${firebase_uid}_${Date.now()}.jpg`;
        const filePath = path.join(uploadDir, fileName);
        fs.writeFileSync(filePath, finalBuffer);

        const imageUrl = `/uploads/${fileName}`;

        console.log("5. กำลังบันทึกลงฐานข้อมูล MySQL...");
        const sqlImage = "INSERT INTO users_images (firebase_uid, image_url, prompt_text) VALUES (?, ?, ?)";

        db.query(sqlImage, [firebase_uid, imageUrl, diary_text], (err, imageResult) => {
            if (err) {
                console.error("MySQL Error (users_images):", err);
                return res.status(500).json({ error: "บันทึกข้อมูลรูปภาพไม่สำเร็จ" });
            }

            const newImageId = imageResult.insertId;

            db.query("SELECT user_id FROM users WHERE firebase_uid = ?", [firebase_uid], (err, userRows) => {
                if (err || userRows.length === 0) {
                    console.error("MySQL Error (find user):", err || "ไม่พบผู้ใช้");
                    return res.status(400).json({ error: "ไม่พบบัญชีผู้ใช้ในระบบ กรุณาล็อกอินใหม่อีกครั้ง" });
                }

                const resolvedUserId = userRows[0].user_id;
                const sqlPost = "INSERT INTO posts (user_id, diary_text, image_id, is_public) VALUES (?, ?, ?, 0)";

                db.query(sqlPost, [resolvedUserId, diary_text, newImageId], (err, postResult) => {
                    if (err) {
                        console.error("MySQL Error (posts):", err);
                        return res.status(500).json({ error: "บันทึกข้อมูลโพสต์ไม่สำเร็จ" });
                    }

                    console.log("✅ วาดรูปและสร้างโพสต์เสร็จสิ้น! พร้อมส่งรูปมังงะขึ้นแอปแล้ว");
                    res.json({
                        success: true,
                        imageUrl: `http://${SERVER_IP}:3000${imageUrl}`,
                        post_id: postResult.insertId
                    });
                });
            });
        });

    } catch (error) {
        const stage = error.stage || 'ไม่ทราบขั้นตอน';
        const status = error.response?.status;
        console.error(`API Error [${stage}]${status ? ` (HTTP ${status})` : ''}:`, error.message);

        let userMessage = "ระบบขัดข้อง กรุณาลองใหม่อีกครั้งครับ";
        res.status(500).json({ error: userMessage });
    }
});

// ---------------------------------------------------------
// 🚀 Route 2: สำหรับดึงโพสต์ที่ "โพสต์แล้ว" ไปแสดงในฟีดสาธารณะ (หน้า Home)
// ---------------------------------------------------------
app.get('/api/diaries', (req, res) => {
    const { firebase_uid } = req.query;
    const sql = `
        SELECT
            p.post_id,
            p.diary_text,
            p.created_at,
            u.user_id,
            u.firebase_uid,
            u.username,
            u.profile_picture,
            ui.image_url,
            (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id) AS like_count,
            EXISTS(
                SELECT 1 FROM likes l2
                JOIN users u2 ON l2.user_id = u2.user_id
                WHERE l2.post_id = p.post_id AND u2.firebase_uid = ?
            ) AS liked_by_me
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        JOIN users_images ui ON p.image_id = ui.image_id
        WHERE p.is_public = 1
        ORDER BY p.created_at DESC
    `;

    db.query(sql, [firebase_uid || null], (err, results) => {
        if (err) {
            console.error("MySQL Error (Feed):", err);
            return res.status(500).json({ error: "ดึงข้อมูลหน้าฟีดไม่สำเร็จ" });
        }

        const mappedResults = results.map(row => {
            let finalUrl = row.image_url;
            if (finalUrl && finalUrl.includes('/uploads/')) {
                const pathOnly = finalUrl.substring(finalUrl.indexOf('/uploads/'));
                finalUrl = `http://${SERVER_IP}:3000${pathOnly}`;
            }
            return {
                ...row,
                image_url: finalUrl
            };
        });

        res.json(mappedResults);
    });
});

// ---------------------------------------------------------
// 🚀 Route 2.1: ไดอารี่ทั้งหมดของ "ฉัน" เอง (ไม่ว่าจะโพสต์แล้วหรือยัง) — หน้า List / Profile
// ---------------------------------------------------------
app.get('/api/diaries/mine', (req, res) => {
    const { firebase_uid } = req.query;

    if (!firebase_uid) {
        return res.status(400).json({ error: 'ต้องมี firebase_uid' });
    }

    const sql = `
        SELECT
            p.post_id,
            p.diary_text,
            p.created_at,
            p.is_public,
            u.user_id,
            u.firebase_uid,
            u.username,
            u.profile_picture,
            ui.image_url,
            (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.post_id) AS like_count
        FROM posts p
        JOIN users u ON p.user_id = u.user_id
        JOIN users_images ui ON p.image_id = ui.image_id
        WHERE u.firebase_uid = ?
        ORDER BY p.created_at DESC
    `;

    db.query(sql, [firebase_uid], (err, results) => {
        if (err) {
            console.error("MySQL Error (My diaries):", err);
            return res.status(500).json({ error: "ดึงข้อมูลไดอารี่ของฉันไม่สำเร็จ" });
        }

        const mappedResults = results.map(row => {
            let finalUrl = row.image_url;
            if (finalUrl && finalUrl.includes('/uploads/')) {
                const pathOnly = finalUrl.substring(finalUrl.indexOf('/uploads/'));
                finalUrl = `http://${SERVER_IP}:3000${pathOnly}`;
            }
            return {
                ...row,
                image_url: finalUrl
            };
        });

        res.json(mappedResults);
    });
});

// ---------------------------------------------------------
// 🚀 Route 3: โพสต์ไดอารี่ที่สร้างไว้ (draft) ให้ขึ้นฟีดสาธารณะ
// ---------------------------------------------------------
app.post('/api/posts/:post_id/publish', (req, res) => {
    const { post_id } = req.params;
    const { firebase_uid } = req.body;

    if (!firebase_uid) {
        return res.status(400).json({ error: 'ต้องมี firebase_uid' });
    }

    const sql = `
        UPDATE posts p
        JOIN users u ON p.user_id = u.user_id
        SET p.is_public = 1
        WHERE p.post_id = ? AND u.firebase_uid = ?
    `;

    db.query(sql, [post_id, firebase_uid], (err, result) => {
        if (err) {
            console.error("MySQL Error (publish post):", err);
            return res.status(500).json({ error: "โพสต์ไม่สำเร็จ" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "ไม่พบโพสต์นี้ หรือคุณไม่ใช่เจ้าของโพสต์" });
        }
        res.json({ success: true });
    });
});

// ---------------------------------------------------------
// 🚀 Route 3.1: ยกเลิกโพสต์ (เอากลับมาเป็นส่วนตัว)
// ---------------------------------------------------------
app.post('/api/posts/:post_id/unpublish', (req, res) => {
    const { post_id } = req.params;
    const { firebase_uid } = req.body;

    if (!firebase_uid) {
        return res.status(400).json({ error: 'ต้องมี firebase_uid' });
    }

    const sql = `
        UPDATE posts p
        JOIN users u ON p.user_id = u.user_id
        SET p.is_public = 0
        WHERE p.post_id = ? AND u.firebase_uid = ?
    `;

    db.query(sql, [post_id, firebase_uid], (err, result) => {
        if (err) {
            console.error("MySQL Error (unpublish post):", err);
            return res.status(500).json({ error: "ยกเลิกโพสต์ไม่สำเร็จ" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "ไม่พบโพสต์นี้ หรือคุณไม่ใช่เจ้าของโพสต์" });
        }
        res.json({ success: true });
    });
});

// ---------------------------------------------------------
// 🚀 Route 4: กด/ยกเลิกไลก์โพสต์ (toggle)
// ---------------------------------------------------------
app.post('/api/posts/:post_id/like', (req, res) => {
    const { post_id } = req.params;
    const { firebase_uid } = req.body;

    if (!firebase_uid) {
        return res.status(400).json({ error: 'ต้องมี firebase_uid' });
    }

    db.query("SELECT user_id FROM users WHERE firebase_uid = ?", [firebase_uid], (err, userRows) => {
        if (err || userRows.length === 0) {
            return res.status(400).json({ error: "ไม่พบบัญชีผู้ใช้" });
        }
        const userId = userRows[0].user_id;

        db.query("SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?", [post_id, userId], (err, likeRows) => {
            if (err) return res.status(500).json({ error: "กดไลก์ไม่สำเร็จ" });

            const alreadyLiked = likeRows.length > 0;
            const sqlToggle = alreadyLiked
                ? "DELETE FROM likes WHERE post_id = ? AND user_id = ?"
                : "INSERT INTO likes (post_id, user_id) VALUES (?, ?)";

            db.query(sqlToggle, [post_id, userId], (err) => {
                if (err) return res.status(500).json({ error: "กดไลก์ไม่สำเร็จ" });

                db.query("SELECT COUNT(*) AS like_count FROM likes WHERE post_id = ?", [post_id], (err, countRows) => {
                    if (err) return res.status(500).json({ error: "กดไลก์ไม่สำเร็จ" });
                    res.json({
                        success: true,
                        liked: !alreadyLiked,
                        like_count: countRows[0].like_count,
                    });
                });
            });
        });
    });
});

// ---------------------------------------------------------
// 🚀 Route 5: ลบโพสต์
// ---------------------------------------------------------
app.delete('/api/posts/:post_id', (req, res) => {
    const { post_id } = req.params;
    const { firebase_uid } = req.body;

    if (!firebase_uid) {
        return res.status(400).json({ error: 'ต้องมี firebase_uid' });
    }

    db.query(
        `SELECT p.post_id FROM posts p JOIN users u ON p.user_id = u.user_id WHERE p.post_id = ? AND u.firebase_uid = ?`,
        [post_id, firebase_uid],
        (err, rows) => {
            if (err || rows.length === 0) return res.status(404).json({ error: "ไม่พบโพสต์นี้" });

            db.query("DELETE FROM likes WHERE post_id = ?", [post_id], (err) => {
                if (err) return res.status(500).json({ error: "ลบโพสต์ไม่สำเร็จ" });
                db.query("DELETE FROM posts WHERE post_id = ?", [post_id], (err) => {
                    if (err) return res.status(500).json({ error: "ลบโพสต์ไม่สำเร็จ" });
                    res.json({ success: true });
                });
            });
        }
    );
});

// ---------------------------------------------------------
// 🚀 Route 6: การแจ้งเตือน
// ---------------------------------------------------------
app.get('/api/notifications', (req, res) => {
    const { firebase_uid } = req.query;

    if (!firebase_uid) {
        return res.status(400).json({ error: 'ต้องมี firebase_uid' });
    }

    const sql = `
        SELECT
            l.like_id,
            l.created_at,
            l.post_id,
            liker.username AS liker_username,
            ui.image_url
        FROM likes l
        JOIN posts p ON l.post_id = p.post_id
        JOIN users owner ON p.user_id = owner.user_id
        JOIN users liker ON l.user_id = liker.user_id
        JOIN users_images ui ON p.image_id = ui.image_id
        WHERE owner.firebase_uid = ? AND l.user_id <> owner.user_id
        ORDER BY l.created_at DESC
        LIMIT 50
    `;

    db.query(sql, [firebase_uid], (err, results) => {
        if (err) {
            console.error("MySQL Error (notifications):", err);
            return res.status(500).json({ error: "ดึงการแจ้งเตือนไม่สำเร็จ" });
        }

        const mappedResults = results.map(row => {
            let finalUrl = row.image_url;
            if (finalUrl && finalUrl.includes('/uploads/')) {
                const pathOnly = finalUrl.substring(finalUrl.indexOf('/uploads/'));
                finalUrl = `http://${SERVER_IP}:3000${pathOnly}`;
            }
            return {
                ...row,
                image_url: finalUrl
            };
        });

        res.json(mappedResults);
    });
});

// ---------------------------------------------------------
// 🚀 Route 7: ส่งรายงานปัญหา (จากแอปมือถือ)
// ---------------------------------------------------------
app.post('/api/reports', (req, res) => {
    const { post_id, reporter_uid, reason } = req.body;

    if (!post_id || !reporter_uid || !reason) {
        return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
    }

    db.query("SELECT user_id FROM users WHERE firebase_uid = ?", [reporter_uid], (err, userRows) => {
        if (err || userRows.length === 0) {
            return res.status(400).json({ error: "ไม่พบบัญชีผู้ใช้" });
        }
        const reporterUserId = userRows[0].user_id;

        // แก้ไขคอลัมน์เป็น reporter_id เพื่อให้ตรงกับ Foreign Key ในตาราง reports
        const sql = "INSERT INTO reports (post_id, reporter_id, reason, created_at) VALUES (?, ?, ?, NOW())";
        db.query(sql, [post_id, reporterUserId, reason], (err, result) => {
            if (err) {
                console.error("MySQL Error (insert report):", err);
                return res.status(500).json({ error: "ส่งรายงานปัญหาไม่สำเร็จ" });
            }
            res.json({ success: true, message: "รายงานปัญหาเรียบร้อยแล้ว" });
        });
    });
});

// ---------------------------------------------------------
// 🚀 Route 8: ดึงข้อมูลสรุปการรายงานทั้งหมด (สำหรับ Web Admin)
// ---------------------------------------------------------
app.get('/api/admin/reports', (req, res) => {
    const sql = `
        SELECT 
            p.post_id AS postId,
            p.diary_text,
            ui.image_url,
            owner.username AS ownerName,
            owner.firebase_uid AS ownerId,
            0 AS strike,
            COUNT(*) AS reportCount,
            GROUP_CONCAT(DISTINCT r.reason SEPARATOR ', ') AS reason
        FROM reports r
        JOIN posts p ON r.post_id = p.post_id
        JOIN users owner ON p.user_id = owner.user_id
        LEFT JOIN users_images ui ON p.image_id = ui.image_id
        GROUP BY p.post_id
        ORDER BY reportCount DESC
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("MySQL Error (admin reports):", err);
            return res.status(500).json({ error: "ดึงข้อมูลการรายงานไม่สำเร็จ" });
        }

        const mappedResults = results.map(row => {
            let finalUrl = row.image_url;
            if (finalUrl && finalUrl.includes('/uploads/')) {
                const pathOnly = finalUrl.substring(finalUrl.indexOf('/uploads/'));
                finalUrl = `http://${SERVER_IP}:3000${pathOnly}`;
            }
            return {
                ...row,
                image_url: finalUrl,
                details: {
                    text: row.diary_text,
                    image: finalUrl,
                    ownerName: row.ownerName,
                    ownerId: row.ownerId,
                    strike: row.strike,
                    logs: []
                }
            };
        });

        res.json(mappedResults);
    });
});

// ---------------------------------------------------------
// 🚀 Route 9: ยกเลิกการรายงานโพสต์ (สำหรับ Web Admin)
// ---------------------------------------------------------
app.delete('/api/admin/reports/:post_id/cancel', (req, res) => {
    const { post_id } = req.params;
    const sql = "DELETE FROM reports WHERE post_id = ?";
    db.query(sql, [post_id], (err, result) => {
        if (err) {
            console.error("MySQL Error (cancel report):", err);
            return res.status(500).json({ error: "ยกเลิกรายงานไม่สำเร็จ" });
        }
        res.json({ success: true, message: "ยกเลิกรายงานเรียบร้อยแล้ว" });
    });
});

// ---------------------------------------------------------
// 🚀 Route 10: ลบโพสต์ถาวร + เพิ่ม Strike เจ้าของโพสต์ (สำหรับ Web Admin)
// ---------------------------------------------------------
app.post('/api/admin/posts/:post_id/delete-and-strike', (req, res) => {
    const { post_id } = req.params;

    db.query("SELECT user_id FROM posts WHERE post_id = ?", [post_id], (err, rows) => {
        if (err || rows.length === 0) {
            return res.status(404).json({ error: "ไม่พบโพสต์นี้" });
        }

        const ownerUserId = rows[0].user_id;

        // บันทึกเพิ่ม Strike
        db.query("UPDATE users SET strike = IFNULL(strike, 0) + 1 WHERE user_id = ?", [ownerUserId], (err) => {
            if (err) console.error("MySQL Error (update strike):", err);

            // ลบรายงาน, ไลก์ และโพสต์ทิ้ง
            db.query("DELETE FROM reports WHERE post_id = ?", [post_id], (err) => {
                db.query("DELETE FROM likes WHERE post_id = ?", [post_id], (err) => {
                    db.query("DELETE FROM posts WHERE post_id = ?", [post_id], (err) => {
                        if (err) {
                            console.error("MySQL Error (delete post admin):", err);
                            return res.status(500).json({ error: "ลบโพสต์ไม่สำเร็จ" });
                        }
                        res.json({ success: true, message: "ลบโพสต์และเพิ่ม Strike เรียบร้อยแล้ว" });
                    });
                });
            });
        });
    });
});

app.listen(3000, '0.0.0.0', () => console.log('Backend Server กำลังทำงานอยู่ที่พอร์ต 3000'));
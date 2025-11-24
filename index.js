// ======================================================
//   WHATSAPP BOT PERKESO + AI GEMINI 2.5 FLASH
// ======================================================

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fetch = require('node-fetch');

const API_URL = "https://script.google.com/macros/s/AKfycbwcz8zeofx6YTI5744cl0ZiGwOucc1eWIm4xLylTAYxhmF16y6ggNxdeZPE1OIJ2OJzFQ/exec";   // <-- Tukar
const GEMINI_KEY = "AIzaSyCvpahgRPmGUTEEgQtDIE-FmWScGBwGvGk";                // <-- Tukar

// WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// ================= QR CODE LOGIN =====================
client.on('qr', qr => {
    console.log("Scan QR untuk login WhatsApp:");
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log("\n==============================================");
    console.log("   WHATSAPP AI BOT PERKESO ACTIVE!  ");
    console.log("   Reminder Queue ✔   |   Auto Reply ✔");
    console.log("==============================================\n");

    setInterval(processQueue, 60 * 1000); // Auto-hantar reminder
});


// ======================================================
//    FUNCTION: AMBIL DATA MAJIKAN & PEMERIKSAAN
// ======================================================
async function getAllData() {
    const res = await fetch(API_URL + "?action=getAllData");
    return await res.json();
}

async function getStatusMajikan(kod) {
    const res = await fetch(API_URL + "?action=getLaporanMajikan&kodMajikan=" + kod);
    return await res.json();
}


// ======================================================
//   WHATSAPP ON MESSAGE (AI REPLY DI SINI)
// ======================================================
client.on('message', async (msg) => {
    const number = msg.from;
    const text = msg.body.trim();

    console.log("📩 Dari:", number, "• Mesej:", text);

    // 1. Semak jika mesej format “Status 123456A”
    if (text.toLowerCase().startsWith("status")) {
        const kod = text.split(" ")[1];

        if (!kod) return msg.reply("Sila masukkan kod majikan.\nContoh: *Status 123456A*");

        const data = await getStatusMajikan(kod);

        if (!data || data.length === 0) {
            return msg.reply(`Kod Majikan *${kod}* tiada dalam rekod pemeriksaan.`);
        }

        const last = data[data.length - 1];
        const totalTunggakan =
            (Number(last.TunggakanAkta4) || 0) +
            (Number(last.TunggakanAkta800) || 0);

        const totalFCLB =
            (Number(last.FCLBAkta4) || 0) +
            (Number(last.FCLBAkta800) || 0);

        let reply = `📄 *Status Pemeriksaan PERKESO*\n`;
        reply += `Kod Majikan: *${kod}*\n`;
        reply += `Tarikh Pemeriksaan: ${last.TarikhPemeriksaan}\n`;
        reply += `Status: *${last.StatusPematuhan}*\n\n`;
        reply += `Tunggakan: RM${totalTunggakan}\n`;
        reply += `FCLB: RM${totalFCLB}\n`;
        reply += `Kes: ${last.StatusKes}\n`;

        return msg.reply(reply);
    }

    // 2. Jika mesej umum → bagi AI Gemini jawab
    const allData = await getAllData();
    const prompt = `
Anda adalah AI Pemeriksa PERKESO Keningau.

DATA MAJIKAN:
${JSON.stringify(allData.majikan)}

DATA PEMERIKSAAN:
${JSON.stringify(allData.pemeriksaan)}

Pengguna WhatsApp menghantar mesej:
"${text}"

Arahan:
1. Jawab mengikut data.
2. Jika pengguna tanya status syarikat, cuba cari berdasarkan kod/Nama Majikan.
3. Jawab dalam Bahasa Malaysia formal PERKESO.
4. Jika tiada data, tetap jawab sopan: "Tiada data dalam rekod PERKESO."
`;

    const ai = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_KEY,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }]}]
            })
        }
    );

    const json = await ai.json();
    const answer = json?.candidates?.[0]?.content?.parts?.[0]?.text
        || "Maaf, saya tidak memahami pertanyaan ini.";

    msg.reply(answer);
});


// ======================================================
//  REMINDER QUEUE (Hantar Mesej Tidak Patuh)
// ======================================================
async function getPending() {
    try {
        const r = await fetch(API_URL + "?action=getPendingReminders");
        return await r.json();
    } catch (err) {
        console.error("Error ambil reminder queue:", err);
        return [];
    }
}

async function updateStatus(IDQueue, Status, LastError = "") {
    await fetch(API_URL + "?action=updateReminderStatus", {
        method: "POST",
        body: JSON.stringify({ IDQueue, Status, LastError })
    });
}

async function processQueue() {
    const list = await getPending();
    if (list.length === 0) return;

    console.log("🔔 Ada", list.length, "reminder menghantar...");

    for (const item of list) {
        const phone = String(item.NoTelefonWhatsApp).replace(/\D/g, "");
        const chatId = phone + "@c.us";

        try {
            await client.sendMessage(chatId, item.MesejWhatsApp);
            console.log("✔ Sent:", item.IDQueue);
            await updateStatus(item.IDQueue, "Sent");
        }
        catch (err) {
            console.log("❌ Error:", err.message);
            await updateStatus(item.IDQueue, "Error", err.message);
        }
    }
}

client.initialize();

/* ============================================================
   DIMITENT — Serverless function αποστολής φόρμας επικοινωνίας
   ------------------------------------------------------------
   Στέλνει το αίτημα στο dimitriadismousamas@gmail.com μέσω του SMTP
   της Google, αυθεντικοποιημένο με App Password του ίδιου λογαριασμού.
   Δεν εμπλέκεται καμία τρίτη υπηρεσία φορμών και δεν χρειάζεται
   καμία επιβεβαίωση παραλήπτη.

   Ο κωδικός (App Password) ορίζεται ως Environment Variable στο
   Vercel — ΠΟΤΕ μέσα στον κώδικα (δες .env.example).
   ============================================================ */

const nodemailer = require('nodemailer');

const LIMITS = { name: 100, phone: 40, email: 120, service: 80, message: 2000 };

/* Καθαρίζει control characters (προστασία από header injection) και κόβει το μήκος. */
function clean(value, max) {
    return String(value == null ? '' : value)
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .trim()
        .slice(0, max);
}

function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

function parseBody(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') {
        try { return JSON.parse(req.body); } catch (e) { return {}; }
    }
    return {};
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    const body = parseBody(req);

    // Honeypot: τα bots συμπληρώνουν το κρυφό πεδίο. Απαντάμε OK ώστε να μην ξαναδοκιμάσουν.
    if (clean(body.website, 50)) {
        return res.status(200).json({ ok: true });
    }

    const name    = clean(body.name,    LIMITS.name);
    const phone   = clean(body.phone,   LIMITS.phone);
    const email   = clean(body.email,   LIMITS.email);
    const service = clean(body.service, LIMITS.service);
    const message = clean(body.message, LIMITS.message);

    if (!name || !phone) {
        return res.status(400).json({ ok: false, error: 'missing_fields' });
    }

    // Μη μυστικές τιμές με προεπιλογή — αλλάζουν με environment variable αν χρειαστεί.
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const user = process.env.SMTP_USER || 'dimitriadismousamas@gmail.com';
    const port = Number(process.env.SMTP_PORT) || 465;
    const to   = process.env.MAIL_TO     || user;

    // Ο κωδικός δεν έχει προεπιλογή — μόνο από environment variable στο Vercel.
    // Το App Password το δείχνει η Google σε 4άδες ("abcd efgh ijkl mnop"),
    // αλλά τα κενά είναι μόνο για την εμφάνιση — τα αφαιρούμε εδώ ώστε να
    // δουλεύει είτε το αντιγράψατε με κενά είτε χωρίς.
    const isGmail = /(^|\.)gmail\.com$|(^|\.)googlemail\.com$/.test(host);
    const rawPass = process.env.SMTP_PASS;
    const pass    = isGmail && rawPass ? rawPass.replace(/\s+/g, '') : rawPass;

    if (!pass) {
        console.error('[contact] Λείπει το SMTP_PASS στα Environment Variables του Vercel.');
        return res.status(500).json({ ok: false, error: 'not_configured' });
    }

    const rows = [
        ['Ονοματεπώνυμο', name],
        ['Τηλέφωνο',      phone],
        ['Email',         email   || '—'],
        ['Υπηρεσία',      service || '—'],
        ['Μήνυμα',        message || '—']
    ];

    const text = rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n');

    const html =
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#212529">' +
        '<h2 style="color:#003D7A;margin:0 0 16px">Νέο αίτημα προσφοράς</h2>' +
        '<table cellpadding="8" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;max-width:600px">' +
        rows.map(function (r, i) {
            return '<tr style="background:' + (i % 2 ? '#F8F9FA' : '#FFFFFF') + '">' +
                   '<td style="border:1px solid #E9ECEF;font-weight:bold;width:170px">' + escapeHtml(r[0]) + '</td>' +
                   '<td style="border:1px solid #E9ECEF;white-space:pre-wrap">' + escapeHtml(r[1]) + '</td></tr>';
        }).join('') +
        '</table>' +
        '<p style="color:#6C757D;font-size:13px;margin-top:18px">Στάλθηκε από τη φόρμα του dimitriadistenta.com</p>' +
        '</div>';

    try {
        const transporter = nodemailer.createTransport({
            host: host,
            port: port,
            secure: port === 465,           // 465 = SSL, 587 = STARTTLS
            auth: { user: user, pass: pass },
            connectionTimeout: 10000,
            greetingTimeout:   10000,
            socketTimeout:     15000
        });

        await transporter.sendMail({
            // Το From ΠΡΕΠΕΙ να είναι το authenticated mailbox, αλλιώς ο server το απορρίπτει.
            from:    '"DIMITENT — Φόρμα Ιστοσελίδας" <' + user + '>',
            to:      to,
            replyTo: email || undefined,    // Reply πάει κατευθείαν στον πελάτη
            subject: 'Νέο αίτημα προσφοράς — ' + name,
            text:    text,
            html:    html
        });

        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('[contact] Αποτυχία SMTP:', err && err.message);
        return res.status(502).json({ ok: false, error: 'send_failed' });
    }
};

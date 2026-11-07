const nodemailer = require('nodemailer');

const clean = (v, n = 300) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, n);
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  if (b.web) return res.status(200).json({ ok: true });
  const d = { nombre: clean(b.nombre, 120), centro: clean(b.centro, 160), email: clean(b.email, 160), telefono: clean(b.telefono, 40), tipo: clean(b.tipo, 80) };
  if (!d.nombre || !d.centro || !/^\S+@\S+\.\S+$/.test(d.email) || !b.consentimiento) return res.status(400).json({ ok: false, error: 'datos' });
  const { SMTP_USER, SMTP_PASS, DEMO_TO } = process.env;
  if (!SMTP_USER || !SMTP_PASS) { console.error('demo: faltan SMTP_USER/SMTP_PASS'); return res.status(500).json({ ok: false, error: 'config' }); }
  const rows = [['Nombre', d.nombre], ['Centro o entidad', d.centro], ['Correo', d.email], ['Teléfono', d.telefono || '—'], ['Tipo de organización', d.tipo], ['Consentimiento de datos', 'Sí']];
  try {
    const t = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: SMTP_USER, pass: SMTP_PASS.replace(/\s+/g, '') } });
    await t.sendMail({
      from: `"Web Gestionnarte" <${SMTP_USER}>`,
      to: DEMO_TO || SMTP_USER,
      replyTo: d.email,
      subject: `Nueva solicitud de demo: ${d.centro}`,
      text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
      html: `<h2 style="font-family:Arial">Nueva solicitud de demo</h2><table cellpadding="6" style="font-family:Arial;border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="border-bottom:1px solid #ddd"><b>${k}</b></td><td style="border-bottom:1px solid #ddd">${esc(v)}</td></tr>`).join('')}</table><p style="font-family:Arial;color:#666">Responde a este correo para contestar directamente a la persona.</p>`
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('demo: envío fallido', e && (e.code || e.responseCode || e.message));
    return res.status(502).json({ ok: false, error: 'envio' });
  }
};

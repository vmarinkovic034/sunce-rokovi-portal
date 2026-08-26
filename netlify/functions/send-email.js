// Šalje email preko Infobip-a. Zahteva verifikovan domen pošiljaoca
// na Infobip nalogu (User Profile → Domains) pre nego što proradi.
export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Metoda nije dozvoljena." }), { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Nevalidan zahtev." }), { status: 400 });
  }

  const { to, subject, text, html } = body || {};
  if (!to || !subject || !text) {
    return new Response(JSON.stringify({ error: "Nedostaje primalac, naslov ili tekst poruke." }), { status: 400 });
  }

  const apiKey = process.env.INFOBIP_API_KEY;
  const baseUrl = process.env.INFOBIP_BASE_URL; // npr. "xxxxx.api.infobip.com" (bez https://)
  const from = process.env.INFOBIP_EMAIL_FROM; // npr. "Sunce Marinković <rokovi@suncemarinkovic.com>" — domen mora biti verifikovan

  if (!apiKey || !baseUrl || !from) {
    return new Response(JSON.stringify({ error: "Email servis nije podešen — nedostaje INFOBIP_API_KEY, INFOBIP_BASE_URL ili INFOBIP_EMAIL_FROM na serveru." }), { status: 500 });
  }

  try {
    const form = new FormData();
    form.append("from", from);
    form.append("to", to);
    form.append("subject", subject);
    form.append("text", text);
    if (html) form.append("html", html);

    const res = await fetch(`https://${baseUrl}/email/3/send`, {
      method: "POST",
      headers: { Authorization: `App ${apiKey}`, Accept: "application/json" },
      body: form,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.requestError?.serviceException?.text || `Infobip greška (HTTP ${res.status}).`;
      return new Response(JSON.stringify({ error: msg }), { status: res.status });
    }

    return new Response(JSON.stringify({ ok: true, messageId: data?.messages?.[0]?.messageId || null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Greška pri povezivanju sa email servisom." }), { status: 500 });
  }
};

// Šalje SMS preko Infobip-a. API ključ i baseUrl žive kao env varijable
// na Netlify-ju (Site settings → Environment variables), nikad u kodu
// koji stiže do browsera.
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

  const { to, text } = body || {};
  if (!to || !text) {
    return new Response(JSON.stringify({ error: "Nedostaje broj telefona ili tekst poruke." }), { status: 400 });
  }

  const apiKey = process.env.INFOBIP_API_KEY;
  const baseUrl = process.env.INFOBIP_BASE_URL; // npr. "xxxxx.api.infobip.com" (bez https://)
  const sender = process.env.INFOBIP_SMS_SENDER || "SunceM";

  if (!apiKey || !baseUrl) {
    return new Response(JSON.stringify({ error: "SMS servis nije podešen — nedostaje INFOBIP_API_KEY ili INFOBIP_BASE_URL na serveru." }), { status: 500 });
  }

  try {
    const res = await fetch(`https://${baseUrl}/sms/2/text/advanced`, {
      method: "POST",
      headers: {
        Authorization: `App ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messages: [{ destinations: [{ to: String(to).replace(/\s+/g, "") }], from: sender, text }],
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.requestError?.serviceException?.text || `Infobip greška (HTTP ${res.status}).`;
      return new Response(JSON.stringify({ error: msg }), { status: res.status });
    }

    const status = data?.messages?.[0]?.status;
    if (status && status.groupName && status.groupName !== "PENDING" && status.groupName !== "DELIVERED") {
      return new Response(JSON.stringify({ error: status.description || "Poruka nije prihvaćena za slanje." }), { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true, messageId: data?.messages?.[0]?.messageId || null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Greška pri povezivanju sa SMS servisom." }), { status: 500 });
  }
};

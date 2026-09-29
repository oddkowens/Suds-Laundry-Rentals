// Serves the static site and handles the contact form.
//
// Everything except /api/contact is passed straight through to the static
// assets in public/. The contact endpoint emails the inquiry via Resend (same
// approach as oddnc.com), so delivery doesn't depend on the visitor's mail app.

const RECIPIENTS = ['landman@servicelaundryrentals.com', 'odd.kowens@gmail.com'];
// oddnc.com is the verified sending domain in ODD's Resend account.
const SENDER = 'Suds Wilmington Website <website@oddnc.com>';

const MAX_BODY_BYTES = 10 * 1024;
const LIMITS = { name: 100, company: 150, email: 254, phone: 40, message: 5000 };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') {
        return json({ ok: false, error: 'Method not allowed' }, 405);
      }
      return handleContact(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  let body;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return json({ ok: false, error: 'That message is too long.' }, 413);
    }
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: 'Could not read that submission.' }, 400);
  }

  // Bots fill in every field they find, including this one hidden from people.
  // Accept silently so they do not learn to work around it.
  if (body._gotcha) {
    return json({ ok: true });
  }

  const field = (k) => String(body[k] || '').trim();
  const name = field('name');
  const company = field('company');
  const email = field('email');
  const phone = field('phone');
  const message = field('message');

  if (!name || !email) {
    return json({ ok: false, error: 'Please fill in your name and email.' }, 400);
  }
  for (const [k, v] of Object.entries({ name, company, email, phone, message })) {
    if (v.length > LIMITS[k]) return json({ ok: false, error: 'That is longer than we can accept.' }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, error: 'That email address does not look right.' }, 400);
  }

  if (!env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not set — cannot send contact email');
    return json({ ok: false, error: "We couldn't send that just now." }, 503);
  }

  const text = [
    `Name: ${name}`,
    `Property / company: ${company || '—'}`,
    `Email: ${email}`,
    `Phone: ${phone || '—'}`,
    '',
    'How can we help?',
    message || '—',
  ].join('\n');

  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: SENDER,
        to: RECIPIENTS,
        reply_to: email,
        subject: `New Suds inquiry from ${name}${company ? ` (${company})` : ''}`,
        text,
      }),
    });
  } catch (err) {
    console.error('Resend request failed', err);
    return json({ ok: false, error: 'Could not reach the mail service.' }, 502);
  }

  if (!response.ok) {
    console.error('Resend rejected the message', response.status, await response.text());
    return json({ ok: false, error: 'The mail service rejected that message.' }, 502);
  }

  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

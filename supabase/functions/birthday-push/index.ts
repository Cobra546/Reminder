import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function karachiParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(p => p.type !== "literal").map(p => [p.type, p.value]));
}

function scheduledMessage(now: Date): { key: string; message: string } | null {
  const p = karachiParts(now);
  const date = `${p.year}-${p.month}-${p.day}`;
  const h = Number(p.hour);
  const m = Number(p.minute);
  const key = `${date}T${p.hour}:${p.minute}`;

  if (date === "2027-06-01") {
    if (m === 0 && h === 0) return { key, message: "24 hours left ❤️" };
    if (m === 0 && h >= 1 && h <= 23) {
      const left = 24 - h;
      return { key, message: `${left} ${left === 1 ? "hour" : "hours"} left ❤️` };
    }
    if (h === 23 && m >= 1 && m <= 59) {
      const left = 60 - m;
      return { key, message: `${left} mins left ❤️` };
    }
  }
  if (date === "2027-06-02" && h === 0 && m === 0) {
    return { key, message: Deno.env.get("BIRTHDAY_MESSAGE") ??
      "Happy Birthday, Keenoo! ❤️🎂 You make life more beautiful. I hope your day is full of happiness, love, and unforgettable moments. ✨" };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const appId = Deno.env.get("ONESIGNAL_APP_ID");
  const apiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
  if (!url || !serviceKey || !appId || !apiKey) {
    return new Response(JSON.stringify({ error: "Missing server secrets" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const due = scheduledMessage(new Date());
  if (!due) return Response.json({ ok: true, sent: false, reason: "No notification scheduled now" }, { headers: cors });

  const supabase = createClient(url, serviceKey);
  const { error: insertError } = await supabase.from("birthday_push_log")
    .insert({ scheduled_key: due.key, message: due.message, status: "pending" });

  if (insertError) {
    const { data: existing } = await supabase.from("birthday_push_log")
      .select("status").eq("scheduled_key", due.key).maybeSingle();
    if (existing?.status === "sent") {
      return Response.json({ ok: true, sent: false, reason: "Already sent" }, { headers: cors });
    }
    if (!existing) {
      return Response.json({ error: insertError.message }, { status: 500, headers: cors });
    }
  }

  const response = await fetch("https://api.onesignal.com/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Key ${apiKey}`,
    },
    body: JSON.stringify({
      app_id: appId,
      target_channel: "push",
      include_aliases: { external_id: ["keenoo-birthday-recipient"] },
      headings: { en: "Keenoo ❤️" },
      contents: { en: due.message },
      url: Deno.env.get("BIRTHDAY_SITE_URL") ?? undefined,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    await supabase.from("birthday_push_log").update({
      status: "failed", response: result,
    }).eq("scheduled_key", due.key);
    return Response.json({ error: "Push provider rejected request", details: result }, {
      status: 502, headers: cors,
    });
  }

  await supabase.from("birthday_push_log").update({
    status: "sent", response: result, sent_at: new Date().toISOString(),
  }).eq("scheduled_key", due.key);

  return Response.json({ ok: true, sent: true, scheduled_key: due.key }, { headers: cors });
});

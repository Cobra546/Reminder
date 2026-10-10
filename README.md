# Keenoo Birthday Push Countdown

This is a **starter project**, not a deployed site. It uses a static HTTPS website, OneSignal Web Push, and a Supabase Edge Function invoked every minute by `pg_cron`.

## Schedule (Asia/Karachi / PKT)

- 1 June 2027, 00:00 — `24 hours left ❤️`
- Every hour at `HH:00` through 1 June 23:00 — `23 hours left ❤️` down to `1 hour left ❤️`
- 1 June 23:01–23:59 — `59 mins left ❤️` down to `1 min left ❤️`
- 2 June 2027, 00:00 — special birthday message

The final message can be changed with the `BIRTHDAY_MESSAGE` Supabase Function secret.

## Important limitations

- Keenoo must open the site on her own device, tap **Enable birthday notifications**, and allow notifications.
- The site must use HTTPS. iPhone web push requires iOS/iPadOS 16.4+ and the site added to the Home Screen.
- Notifications may be delayed or blocked by device/browser settings, battery restrictions, connectivity, or push services. Minute-by-minute delivery is best-effort, not guaranteed at the exact minute.
- This does not send Instagram DMs or read incoming messages.
- The public OneSignal App ID belongs in `index.html`. Never put the OneSignal REST API key, Supabase service-role key, or cron secret in frontend code.
- This repository does not create the OneSignal/Supabase projects or deploy itself.

## 1. OneSignal

1. Create a OneSignal app and configure **Web Push** for your actual website origin.
2. Choose the HTTPS origin you will host on (for example, your GitHub Pages URL) and follow OneSignal's web-push setup.
3. Copy the OneSignal App ID into `index.html`, replacing `YOUR_ONESIGNAL_APP_ID`.
4. Host `index.html` and `OneSignalSDKWorker.js` at the website root.
5. Open the live HTTPS site on Keenoo's phone; she must tap the button and grant permission.

## 2. Supabase

1. Create a Supabase project.
2. Set these Edge Function secrets:
   - `CRON_SECRET` — a long random string
   - `ONESIGNAL_APP_ID` — the same OneSignal App ID
   - `ONESIGNAL_REST_API_KEY` — OneSignal REST API key (server only)
   - `BIRTHDAY_MESSAGE` — optional custom birthday message
   - `BIRTHDAY_SITE_URL` — optional live website URL
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — standard server-side Supabase values
3. Deploy the function: `supabase functions deploy birthday-push --no-verify-jwt`. The custom `x-cron-secret` check is still required.
4. In Supabase SQL Editor, enable `pg_cron`, `pg_net`, and Vault if available.
5. In `setup.sql`, replace `YOUR_PROJECT_REF` and `REPLACE_WITH_THE_SAME_RANDOM_CRON_SECRET` with real values, then run it.
6. Test the page and function before the birthday. Avoid repeatedly sending test pushes without the recipient's agreement.

## Recipient identity and privacy

The page uses OneSignal external ID `keenoo-birthday-recipient`; the Edge Function targets that ID only. Keep the setup link private and only enable notifications on the intended recipient's device. For stronger recipient isolation, add a private enrollment flow before launch.

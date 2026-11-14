# Rally backend

Postgres, sign-in and security rules for the Rally web app (`../womens-sports-hub`) and iPhone app (`../womens-sports-hub-ios`). Built on Supabase.

## What's in it

- `supabase/migrations`: tables `follows` and `push_tokens`, row-level security so each user only sees their own rows, and `delete_my_account()`.
- `supabase/templates/magic_link.html`: sign-in email. The web uses its link, the iPhone app uses its 6-digit code.
- `scripts/rls-test.mjs`: checks the security rules with two real users.

## Run it locally

Needs Docker.

    npx supabase start -x vector,logflare,studio,edge-runtime,imgproxy,storage-api,realtime,postgres-meta,supavisor
    eval "$(npx supabase status -o env | grep -E '^(API_URL|ANON_KEY)=')"
    SUPABASE_URL=$API_URL SUPABASE_ANON_KEY=$ANON_KEY node scripts/rls-test.mjs

Local emails land in the inbox at http://127.0.0.1:54324. Stop with `npx supabase stop`.

## Point the apps at it

- Web: set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.local.example` in the web repo).
- iPhone: `Config/Debug.xcconfig` holds the local values. `Config/Release.xcconfig` is empty until a hosted project exists.

## Go live (hosted Supabase)

1. Create a project at supabase.com. Pick a strong database password.
2. `npx supabase login`, then `npx supabase link --project-ref <ref>`, then `npx supabase db push`.
3. Authentication > Email Templates: paste `supabase/templates/magic_link.html` into both "Magic link" and "Confirm signup". Set the subject to "Your Rally sign-in code".
4. Authentication > URL Configuration: set the Site URL to the deployed web address and add `<site>/following` and `<site>/account` as redirect URLs.
5. Authentication > SMTP: add a real mail provider (Resend, Postmark). Supabase's built-in mailer only sends a few emails an hour.
6. Put the project URL and anon key into Vercel (web) and `Config/Release.xcconfig` (iPhone). The anon key is public by design. Never ship the service-role key.
7. Run `scripts/rls-test.mjs` against the hosted project before launch.

## Later

Sign in with Apple (needs the paid Apple Developer account), push notification sender, predictions tables.

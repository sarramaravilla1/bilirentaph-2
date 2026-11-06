# BiliRentaPH 2.2 — Supabase MVP

Map-first property discovery with Supabase authentication, approved live listings, favorites and owner submissions. When no approved live listings are returned, six fictional demo properties appear. No real contact/inquiry workflow yet.

## Set up

1. Create a Supabase project at https://supabase.com/dashboard.
2. In **SQL Editor**, run `supabase/schema.sql` once on a fresh project. It creates tables, RLS policies, and a public property photo bucket.
3. In **Project Settings → API / Connect**, copy the **Project URL** and **publishable key** (or legacy anon key). Never use the secret/service-role key in Vite.
4. Copy `.env.example` to `.env.local`, fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. For Vercel, set these two under **Project → Settings → Environment Variables** for Production, Preview, Development as needed, then **redeploy**.
5. In **Authentication → URL Configuration**, set Site URL to `https://bilirentaph-2.vercel.app` and add that URL as an allowed redirect URL. Check email confirmation settings; new users may need to confirm before signing in.
6. `npm install && npm run dev` to develop, `npm run build` to verify. Commit source, never `.env.local`.
7. Sign up, confirm email if required, sign in, and submit a property. In **Supabase Table Editor → properties**, set the submission `status` to `approved` manually (trusted dashboard only). Reload the site to see the live marker and listing. To test demo fallback, use a database with no approved listings.

## Limitations / security

- Demo fallback is intentional; don't mistake sample properties for actual listings.
- Users can insert pending listings only. No browser-side approval, editing, or deletion in this release.
- The photo bucket is public: upload property photos only, not personal documents.
- The form accepts approximate owner-supplied coordinates; these are not geocoded or verified.
- Authentication and favorites require configured Supabase. Images are limited to 5 MB, jpeg/png/webp.
- Map tiles use OpenStreetMap public tiles for low-volume development only; select a commercial/hosted provider before scaling.
- Add abuse prevention, spam controls, admin tooling, privacy policy, and privacy/security review before public launch.

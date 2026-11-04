# BiliRentaPH 2.0 — Step 1 Starter

A responsive React + TypeScript frontend prototype. **All six listings are fictional demo data.** Search, buy/rent filtering, type filtering, maximum price filtering, detail modal, and in-session favorites work. No real map, accounts, database, owner contact, or listing submission is implemented yet.

## Run locally

1. Install Node.js 20.19+ or 22.12+.
2. In this folder, run `npm install`.
3. Run `npm run dev` and open the local URL shown.
4. Run `npm run build` to produce the `dist/` folder.

## Deploy

Create a GitHub repository, commit this project (not `node_modules` or `dist`), and import the repository in Netlify. Set build command `npm run build` and publish directory `dist`. You can also deploy the `dist/` folder manually after building.

## Next steps

1. Add Supabase and PostGIS, with Row Level Security and private credentials kept server-side.
2. Replace demo listings with verified data.
3. Add MapLibre GL JS with a licensed basemap provider.
4. Add sign-up/login, listing submission, image upload, and moderation.
5. Add accessibility, performance, privacy, and abuse tests.

Do not publish demo properties as real listings. Photos load from Unsplash URLs and are only temporary visual placeholders; verify image licensing for production use.

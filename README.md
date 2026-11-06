# BiliRentaPH 2.1 — Map-first preview

A React + TypeScript + Vite property discovery prototype with MapLibre GL JS.

## Run locally

```bash
npm install
npm run dev
```

## Deploy to Vercel

Push these files to the root of your existing GitHub repository. Vercel should automatically rebuild the project. Build command: `npm run build`; output: `dist`.

## What works

- Split-screen property cards and map (mobile list/map toggle)
- Clickable map price markers and synchronized selection
- Buy/rent, property type, maximum price, and text search filters
- Property detail modal and in-session favorites
- Six fictional demo listings

## Important limitations

- **Map coordinates are approximate city centers, not actual listing addresses.**
- Sample listing photos are externally hosted; listings are fictional.
- Favorites are temporary and reset on refresh.
- No login, database, property submissions, verified hazard layers, or live inquiries.
- Map uses the public OpenStreetMap raster tile service for **small-scale development only**. Before production, configure a commercial/hosted tile provider and follow its usage and attribution requirements.
- MapLibre and the map tiles require internet access.

## Next phase

Supabase/PostGIS, real listing workflows, moderation, and secure user accounts.

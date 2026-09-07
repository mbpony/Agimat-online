# ⚜️ AGIMAT ONLINE

**Ang Alamat ng Kapuluan** — a browser-based 3D action RPG rooted in Philippine
mythology. Real-time combat, 9 classes with 20 skills each, world bosses, guilds,
marketplace, ranked arena, and 5-player online co-op with shared enemies + chat.

Built with Three.js (no build step) + a single Node.js server (http + WebSocket).

## Play locally
```bash
npm install
npm start        # → http://localhost:8000
```

## Deploy (Render free tier)
This repo contains `render.yaml` — on https://render.com choose
**New + → Blueprint**, select this repo, click **Apply**. Done.
Or manually: **New + → Web Service** → build `npm install`, start `node server.js`.

⚠️ Free tier notes:
- The server sleeps after ~15 min idle; first visit takes ~1 min to wake.
- No persistent disk on free tier: player accounts reset when the service
  redeploys/restarts. For permanent saves, attach a disk (paid) and set
  env `DATA_DIR=/data`, mounting the disk at `/data`.

## Docs
See `docs/` — architecture, migration status, class design, enemy bible, security posture.

# 🚀 AGIMAT ONLINE — Put it online (GitHub + Render, free)

Total time ~15 minutes. When done, you and your friends open the same URL,
log in, and play together (co-op channels of 5, chat, duels, marketplace).

---

## STEP 1 — Push to GitHub

The git repo is already prepared and committed in this folder (`agimat/`).

1. Create the empty repo: https://github.com/new
   - Name: `agimat-online` · Public or Private · **do NOT add a README**
2. From inside the `agimat/` folder run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/agimat-online.git
git push -u origin main
```

GitHub will ask you to sign in (browser popup or a Personal Access Token —
create one at https://github.com/settings/tokens if prompted, scope: `repo`).

> Alternative without terminal: GitHub → repo → "uploading an existing file"
> and drag everything EXCEPT `node_modules/` and `legacy/`. The git way is better.

## STEP 2 — Deploy on Render (Blueprint, one click)

1. https://render.com → sign up **with your GitHub account** (free).
2. Dashboard → **New +** → **Blueprint**.
3. Pick the `agimat-online` repo → Render reads `render.yaml` → **Apply**.
4. Wait ~2–3 min for the first build. Your game is live at:
   `https://agimat-online.onrender.com` (exact URL shown on the service page)

That's it. Share the URL with friends — accounts, co-op, guilds, market,
arena all work over the internet (WebSocket auto-uses `wss://`).

## STEP 3 — Auto-deploy updates

`autoDeploy: true` is set: every `git push` to `main` redeploys automatically.
When you add the new 3D assets later:

```bash
git add -A && git commit -m "new world assets" && git push
```

---

## 🔒 Branch protection on `main` (enabled 2026-09-09)

A ruleset named **`protect-main`** is active on the default branch:

| Rule | Effect |
|---|---|
| `non_fast_forward` | force-pushes to `main` are rejected — history cannot be rewritten |
| `deletion` | `main` cannot be deleted |
| *(no `pull_request` rule)* | direct `git push` still works, so auto-deploy is unaffected |

Settings → Branches → `protect-main` to change it.

**Why:** the repo auto-deploys to Render on every push, so anyone able to push
to `main` can put code in front of live players. Blocking force-pushes and
deletion means a leaked credential can add a commit but cannot erase or rewrite
history.

Note that the `agimat dev` fine-grained token cannot modify these settings
(Administration is read-only on it) — verified 2026-09-09: setting branch
protection, creating rulesets and managing webhooks all return `403`.

## Re-adding the remote in a fresh chat session

The Arena workspace snapshot strips `.git/config`, so the remote URL does not
survive between sessions. Run `./tools/push.sh` — it re-adds `origin`
(`github.com/mbpony/Agimat-online`) and shows a dry-run diff before pushing.


---


## ☁️ Permanent player saves (Upstash Redis — FREE)

Render's free tier wipes the local disk on **every deploy and every spin-down/wake**.
To make accounts survive forever, the server mirrors `users/guilds/market` to a free
Upstash Redis database whenever these two environment variables are set:

1. Create a free account at **https://console.upstash.com** (no credit card).
2. **Create Database** → name `agimat` → Regional → pick a region near your Render region → Create.
3. Open the database → **REST API** tab → copy the two values.
4. In Render: your service → **Environment** → add:
   - `UPSTASH_REDIS_REST_URL` = the REST URL (looks like `https://xxxx.upstash.io`)
   - `UPSTASH_REDIS_REST_TOKEN` = the REST token
5. **Save Changes** → Render redeploys automatically. Boot log should show
   `[cloud] hydrated — users:N …` and `[cloud saves: ON]`.

How it works: on boot the server loads all accounts from Upstash (cloud wins over the
possibly-wiped disk); changes are pushed at most every 15 s per store, plus a final
flush on SIGTERM. Without the env vars the server runs file-only exactly as before.
Free-tier budget: 500K commands/month; this design uses roughly ~9K/day worst case — safely inside.

## ⚠️ Free-tier facts (so nothing surprises you)

| Thing | Reality |
|---|---|
| Sleep | Server sleeps after ~15 min with no visitors; next visit takes ~50 s to wake. Tell friends to be patient on first load. |
| **Player saves** | Free tier has **no persistent disk** → server-side accounts (users/guilds/market) reset on every deploy/restart. Local single-player saves live in each browser and survive. |
| Permanent saves | Upgrade the service (Starter) → add a **Disk** mounted at `/data` → add env var `DATA_DIR=/data`. The server already supports this (server.js line 13). |
| Player capacity | 10 co-op channels × 5 players = 50 concurrent, fine for the free instance. |

## Custom domain (later)
Service → Settings → Custom Domains → add `agimatonline.ph`, then set the
DNS records Render shows you at your registrar.

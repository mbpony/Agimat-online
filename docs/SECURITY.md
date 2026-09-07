# AGIMAT ONLINE — SECURITY
*Status: documents CURRENT posture honestly. Target = spec §25.*

## Current posture (after Phase 7a, 2026-09-08)
- GOLD is server-authoritative. IMPLEMENTED — per-account ledger (rec.g); /api/save
  validates & clamps gold against bal + credits + earn window (60k+12k/lvl per hour,
  8h cap) + burst (30k+6k/lvl); clamped saves flagged (rec.g.flags audit counter) and
  the corrected value is echoed to the client, which adopts it. Old clients unaffected.
- Server-side funds checks: market 'buy' and guild 'donate' reject if stored-save gold
  is insufficient; both debit the ledger. Daily rewards and market mail_claim credit it. IMPLEMENTED
- /api/arena 'report' rate-limited to 1 per 45s; win PURSES are server-issued via mail
  (300–1000 gold by rating, first 5 wins/UTC day) and credit the gold ledger on claim. IMPLEMENTED
  (the win/loss verdict itself is still client-claimed — server-simulated duels PLANNED)
- MARKETPLACE is server-authoritative (Phase 8, 2026-09-08). IMPLEMENTED —
  'post' requires the item to exist in the seller's stored save (uid+name+rarity+ilvl
  match, bag or gear); the SERVER's stored copy is listed so client-side stat tampering
  is ignored; true escrow (rec.esc): the item leaves the stored save at post time and
  every incoming /api/save is stripped of escrowed items (bag AND gear) — restoring a
  pre-post backup cannot duplicate a listed item. Escrow released on buy/cancel.
  Strips are reported to the client (escStripped) and bump the rec.g.flags audit counter.
- Non-market inventory (loot drops, forage, enhancement results) still client-trusted. NOT YET (later phase)
- WS trusts position/kill claims from host client. IMPLEMENTED (host-authoritative between peers, not server-authoritative)

## Target (spec §25) — remaining
Order of hardening (per spec §25 / master phases):
1. Gold: server computes deltas from validated events, rejects impossible jumps — ✅ DONE 2026-09-08 (clamp model)
2. Inventory ownership (marketplace scope): server-side item verification + escrow ledger — ✅ DONE 2026-09-08 (rec.esc; full loot-source ledger still PLANNED)
3. Marketplace: listings/purchases validated server-side (escrow pattern) — ✅ DONE 2026-09-08
4. Rewards (quest/boss/dungeon/pvp): server issues, client only displays — 🔶 arena purses DONE 2026-09-08; quest/boss/dungeon still client-side
5. Enhancement rolls: server RNG
6. Anti-cheat heuristics: rate limits, plausibility windows, audit log
Non-negotiables already true: no client-set account fields on other users; passwords hashed (see server.js); tokens per session.

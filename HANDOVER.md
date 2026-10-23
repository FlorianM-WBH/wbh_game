# Handover

Status: DONE

## Current state (after session 3, 2026-10-23)

**Miami Motors '86**: a browser game (TypeScript + Vite + Phaser 3.90). You play a used-car dealer in 1986 Miami. All milestones M1–M7 are implemented and verified by automated tests. No human has playtested it yet.

### What works

- **Lot and world:** top-down lot (640x360, procedural pixel art) with the office/showroom, a workshop with 1–2 lifts, the buy-in zone ("ANKAUF"), 4–10 parking slots, a street with traffic, beach, palms and street lamps. Evening tint, then night lights (lamps, neon sign, bar, windows) from 17:00.
- **Player** moves freely (WASD/arrows) with collision, front/back walking frames. `E`/Space interacts; holding `E` at a lift with a running job makes it 3× faster (only that bay).
- **Customers** (10 archetypes): buyers (class preferences, taste tags, 50% with a wish for an extra), sellers (bring a car), service customers (bring their own car for one paid job with a deadline). They leave when ignored. Customers who leave with their car walk to it and drive off.
- **Negotiation panel:** price steps, offers, accepting counteroffers, three tactics (charm, hardball, "exaggerate" via tech), mood and patience, walkouts.
- **Price tags (M4):** any lot car can get a tag (0.9–1.35 × market value). Waiting buyers walk up to tagged cars they like and pay the tag without haggling if it is below a stingier ceiling. Otherwise a speech bubble shows their rejection.
- **Dealer auction (M4):** tech "BTX-Händlerauktion" → computer menu "Händlerauktion öffnen": 3 cars per day at 72–95% of value + $150 fee; exact condition only with the "Gutachter" tech.
- **Loan shark (M4):** office → "Kredithai anrufen": borrow up to $40k, 3% daily interest; a negative balance at closing is covered automatically (+20%); debt above $60k at closing = game over (save deleted, new game).
- **Reputation (M4):** 0–100, shown as 0–5 stars in the HUD. Deals and finished jobs raise it; walkouts and missed deadlines lower it. It affects the customer rate (×0.6–1.4) and starting mood. Below 50 it drifts back overnight.
- **Workshop:** 4 components to repair, 8 upgrades (most need tech). Second lift with the first workshop upgrade; jobs run in parallel; HUD shows one bar per bay.
- **Progression:** office (stats, building upgrades: 6 buildings, 10 levels; save; end day; loan shark; statistics and records), computer (16 techs in 4 branches + auction). "Imperium %" = share of all techs and building levels; victory screen with full stats at 100%.
- **Buildings change the look:** parking cones turn into slots, showroom glass + display cars + disco ball + neon trim, second workshop bay + tuning checkers, neon sign, cocktail bar, flamingos.
- **Records** across games (localStorage): best profit, company worth, best deal, fastest empire day. Shown on the title screen, in the office and at the end of the day/victory.
- **Day cycle** 08:00–20:00 (~6 real minutes), rent + interest at closing, day summary, autosave, title screen (number keys or Enter).
- **Audio:** WebAudio sound effects + procedural synthwave loop; `M` mute, `N` music. Volume levels (master/music/effects) in Settings (title screen or pause menu).
- **Menus/help:** `Esc` on the lot opens the pause menu (help, settings, save, back to title); `F1` opens help; "Nächster Schritt" first-steps box (7 tips, `H` hides it).

### Known weaknesses (none block the brief)

- Balance has only been checked by bots: the human-like bot (`tests/unit/playbot.ts`) finishes the empire in 20–28 game days; humans are expected to need 3–5 hours. Expensive cars give the biggest profits.
- Cars drive through each other and the player (cosmetic). While a customer walks to a car on the lift, the lift is already free in the sim; another car put there overlaps for a few seconds (cosmetic).
- The main JS bundle is 1.6 MB (Phaser); fine for a local or static site.
- Save version is still 1; all fields added since are optional, so old saves load.

## Possible next steps (only if more work is wanted; the brief is done)

1. Human playtest; tune prices and costs from the feedback (`src/content/models.ts`, `src/content/progression.ts`, `src/sim/economy.ts`), then re-run `npm test` (pacing test guards 15–45 bot days).
2. Push to GitHub and enable Pages (repository settings → Pages → Source "GitHub Actions"); the workflow is in `.github/workflows/pages.yml`. Pushing was not done because nobody asked for it.
3. Content: more car models, dialogue lines, a quick car-wash job, random events (e.g. police check, celebrity customer).
4. Cosmetic: cars avoiding each other, a lift animation, mobile/touch controls.

## How to build, run, and test

All commands from `game/`. Node 22 and Google Chrome are installed system-wide; nothing needed sudo.

```bash
npm install          # once (node_modules is gitignored)
npm run dev          # dev server at http://localhost:5173
npm run build        # typecheck + production build to dist/
npm test             # Vitest unit tests (sim, content, market/finance/reputation, bots incl. long-run pacing)
npm run smoke        # needs a fresh build: serves dist/, drives the game in headless Chrome,
                     # checks ~50 steps and writes screenshots to tests/smoke/out/ (gitignored)
npm run soak         # needs a fresh build: 10 fast-forwarded days in the browser, checks errors and object leaks
npm run check        # build + test + smoke
```

- Smoke/soak use `playwright-core` with the system Chrome (`channel: 'chrome'`, SwiftShader WebGL). No browser download.
- Look at the screenshots in `tests/smoke/out/` with the Read tool to check visuals.
- Debug hooks for tests live in `src/debug.ts` (`window.__mm`: `newGame(seed)`, `advance(minutes)`, `spawn('buy'|'sell'|'service')`, `interact(target)`, `teleport(x,y)`, `menuTitle()`, `analyseMusic(seconds)`).
- Code style: single quotes, print width ~160. Do **not** run prettier with default settings (it rewrites whole files).

## Code map

- `src/sim/` – pure, deterministic simulation (no Phaser): `state.ts` (types), `game.ts` (new game, tick, end of day, save), `economy.ts` (values, modifiers), `customers.ts`, `negotiation.ts` (incl. `recordSale`), `workshop.ts` (lifts/bays, jobs), `service.ts` (service customers), `market.ts` (price tags, browsing buyers, auction), `finance.ts` (loan shark, game over), `reputation.ts`, `progression.ts`, `rng.ts`.
- `src/content/` – data and German text: car models, archetypes and their lines, negotiation lines, workshop repairs/upgrades, tech tree and buildings, service, remarks, reactions, `market.ts` (tag/auction/shark lines).
- `src/art/` – procedural pixel art (cars, characters with front/back frames, lot background incl. building levels and lamps, pixel font) and Phaser texture helpers (incl. `glow` and `light`).
- `src/audio.ts` (sfx, buses, mute/volume prefs), `src/music.ts` (procedural synthwave), `src/tutorial.ts` (first-steps tips; append new tips at the end).
- `src/scenes/LotScene.ts` – the world: movement, collision, NPC walking (incl. browsing and getting into cars), car driving, night lights, price-tag markers, prompts, bubbles. `layout.ts` holds all coordinates.
- `src/app.ts` – controller: all menus (office, loan shark, statistics, computer, auction, lifts, cars, price tags, customers, pause, settings, help), HUD, day summary, game over, victory, records, save/load.
- `src/ui/` – DOM overlay (`ui.ts` menus/toasts/prompt/bubbles, `negotiationPanel.ts`, `style.css`).
- `tests/unit/` – Vitest; `playbot.ts` is the human-like bot used by `longrun.test.ts`. `tests/smoke/` – browser smoke and soak scripts.

## Manual installation log

Nothing had to be installed manually in any session. Already present on the machine: Node 22.22, npm 10.9, Google Chrome 152. npm packages are installed by `npm install` (registry access works).

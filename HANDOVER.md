# Handover

Status: IN PROGRESS

## Current state (after session 2, 2026-10-23)

**Miami Motors '86**: a browser game (TypeScript + Vite + Phaser 3.90). You play a used-car dealer in 1986 Miami. M1 (vertical slice), M2 (feel and content) and M3 (service customers) are done and verified.

- Top-down lot (640x360, procedural pixel art) with an office/showroom, a workshop with a lift, a buy-in zone ("ANKAUF"), 10 parking slots (4 unlocked at the start), a street with passing traffic, a beach, palms, and an evening light tint.
- The player character moves freely (WASD/arrows) with collision. `E`/Space interacts with the nearest thing: customers, cars, office door, computer, lift. Holding `E` at the lift while a job runs makes it 3× faster.
- Customers (10 archetypes) arrive as **buyers**, **sellers** or **service customers** and leave if ignored. Sellers and service customers park at the buy-in zone.
- **Buyers** have class preferences, taste tags and (50%) a **wish** for a specific extra ("Hat der ein Kassettendeck?"); a fulfilled wish pays ×1.15, a missing one ×0.95; matching lot cars get a ★. Pitch lines react to the wish, liked extras and the car's condition.
- **Negotiation panel**: price stepping, offers, accept counteroffer, three tactics (charm, hardball, "exaggerate" via tech) with archetype-specific reactions, mood and patience, walkouts.
- **Service customers** (`src/sim/service.ts`): bring their own car with one job (repair or unlocked extra), fixed fee, pickup deadline. Accept / ask for +25% / decline. Put the car on the lift (car menu or lift menu), do the job, choose "Fertig! Wagen übergeben" to get paid (+tip if early). Missed deadline: they drive off with the car, no money.
- **Workshop**: 4 components to repair, 8 upgrades (most unlocked via tech).
- **Office**: stats, building upgrades (6 buildings, 10 levels), save, end the day. **Computer**: 15 techs in 4 branches.
- Day cycle 08:00–20:00 (about 6 real minutes), rent at closing, day summary, autosave, title screen. "Imperium %" = share of all techs and building levels; victory screen at 100%.
- **Audio**: WebAudio sound effects and a procedural synthwave loop (`src/music.ts`), started on the first key/click. `M` mutes all, `N` toggles music (persisted).
- **Onboarding**: intro text plus a "Nächster Schritt" box (top right) for the first 6 core actions (`src/tutorial.ts`), `H` hides it.

## What is broken / weak (known)

- No human playtesting; balance only checked by the bot test (bot goes $8k → ~$50k in 14 days, maybe too fast). Service jobs add roughly $300–1,600 profit each on top.
- Service customer walks off on foot while their car drives away separately (cosmetic).
- Characters are small (12x20) with no up/down poses; cars drive through each other and the player (cosmetic only).
- Toasts can pile up when a lot happens at once (e.g. after fast-forwarding).
- Main JS bundle is 1.5 MB (Phaser); fine for now.
- Save version is still 1; new fields (`wish`, `service`, `ownerId`, `tips`, `servicesDone`) are optional, so old saves load.

## Next steps (milestone plan, in priority order)

1. **M4 – Deeper economy**: price tags on lot cars (set an asking price; buyers walk up to cars they like and may accept the tag price without haggling), dealer auction at the computer (buy cars without a seller, unlocked by tech), loans/debt from Onkel Sal's loan shark with game over at heavy debt, reputation that affects customer rate and mood (e.g. finished/missed service jobs, walkouts).
2. **M5 – Visual upgrades**: second lift (workshop level), visible showroom cars, more building detail per level, characters with up/down poses, night neon glow, service customer getting into their car.
3. **M6 – Balance and goals**: tune prices/costs with the bot test over 60+ days so the full imperium takes ~3–5 hours (bot should also take service jobs); "max profit" highscore; end screen stats. Maybe a quick car-wash job.
4. **M7 – Polish and release**: settings (volume sliders), keyboard help overlay, GitHub Pages build, final full verification → set `Status: DONE`.

## How to build, run, and test

All commands from `game/`. Node 22 and Google Chrome are installed system-wide; nothing needed sudo.

```bash
npm install          # once (node_modules is gitignored)
npm run dev          # dev server at http://localhost:5173
npm run build        # typecheck + production build to dist/
npm test             # Vitest unit tests for the simulation (tests/unit)
npm run smoke        # needs a fresh build: serves dist/, drives the game in headless Chrome,
                     # checks ~25 steps and writes screenshots to tests/smoke/out/ (gitignored)
npm run check        # build + test + smoke
```

- The smoke test uses `playwright-core` with the system Chrome (`channel: 'chrome'`, SwiftShader WebGL). No browser download.
- Look at the screenshots in `tests/smoke/out/` with the Read tool to check visuals.
- Debug hooks for tests live in `src/debug.ts` (`window.__mm`: `newGame(seed)`, `advance(minutes)`, `spawn('buy'|'sell'|'service')`, `interact(target)`, `teleport(x,y)`, `menuTitle()`, `analyseMusic(seconds)`).

## Code map

- `src/sim/` – pure, deterministic simulation (no Phaser): `state.ts` (types), `game.ts` (new game, tick, end of day, save), `economy.ts` (values, modifiers), `customers.ts`, `negotiation.ts`, `workshop.ts`, `progression.ts`, `rng.ts`.
- `src/content/` – data and German text: car models, archetypes and their lines, negotiation lines, workshop repairs/upgrades, tech tree and buildings.
- `src/art/` – procedural pixel art (cars, characters, lot background, 5x5 pixel font) and Phaser texture helpers.
- `src/sim/service.ts` – service customers (orders, fee, deadline, hand-over). `src/content/service.ts`, `remarks.ts` (wishes, upgrade/condition lines), `reactions.ts` (archetype tactic reactions).
- `src/audio.ts` (sfx + buses + mute prefs), `src/music.ts` (procedural synthwave, `analyseMusic` for tests), `src/tutorial.ts` (first-steps tips).
- `src/scenes/LotScene.ts` – the world: movement, collision, NPC walking, car driving, prompts. `layout.ts` holds all coordinates.
- `src/app.ts` – controller: all menus (office, computer, lift, cars, customers), HUD, day summary, save/load.
- `src/ui/` – DOM overlay (`ui.ts` menus/toasts/prompt, `negotiationPanel.ts`, `style.css`).

## Manual installation log

Nothing had to be installed manually in session 1. Already present on the machine: Node 22.22, npm 10.9, Google Chrome 152. npm packages are installed by `npm install` (registry access works).

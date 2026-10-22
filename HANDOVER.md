# Handover

Status: IN PROGRESS

## Current state (after session 1, 2026-10-23)

**Miami Motors '86**: a browser game (TypeScript + Vite + Phaser 3.90). You play a used-car dealer in 1986 Miami. M1, the playable vertical slice, is done and verified:

- Top-down lot (640x360, procedural pixel art) with an office/showroom, a workshop with a lift, a buy-in zone ("ANKAUF"), 10 parking slots (4 unlocked at the start), a street with passing traffic, a beach, palms, and an evening light tint.
- The player character moves freely (WASD/arrows) with collision against buildings, cars and palms. `E`/Space interacts with the nearest thing: customers, cars, office door, computer, lift. Holding `E` at the lift while a job runs makes it 3× faster.
- Customers (10 archetypes: yuppie, Ohio pensioner, aerobics queen, mullet rocker, Little Havana godfather, tourist, surfer, undercover cop, disco diva, home-computer nerd) arrive as buyers or sellers, wait with limited patience, and leave if ignored. Sellers drive their car into the buy-in zone.
- Negotiation panel: price stepping, make an offer, accept their counteroffer, three tactics (charm, hardball, "exaggerate", the last unlocked by tech), mood and patience meters, insults, walkouts, lots of German 80s jokes.
- Workshop: 4 components (engine, body, interior, tyres) to repair, 8 upgrades (polish, cassette deck, neon underglow, pastel paint, chrome rims, turbo, car phone, white leather), most of them unlocked via tech.
- Office: stats, building upgrades (6 buildings, 10 levels: lot size, showroom price bonus, workshop speed, neon sign, cocktail bar, flamingos), save, end the day. The lot art changes with the building levels.
- Computer: tech tree with 15 techs in 4 branches (Werkstatt, Tuning, Verkauf, Marketing) with prerequisites.
- Day cycle 08:00–20:00 (about 6 real minutes), rent at closing, day summary, autosave to localStorage, title screen with Continue/New. "Imperium %" = share of all techs and building levels owned; at 100% a victory screen appears (play can continue).
- Sound effects via WebAudio (no files). `M` toggles sound.

## What is broken / weak (known)

- No music yet. No real playtesting by a human; balance is only checked by the bot test (a simple bot goes from $8k to ~$50k in 14 days, which may be too fast).
- Characters are small (12x20 art pixels); there are no walk-up/down poses, only a 2-frame step with horizontal flip.
- Cars drive through each other and through the player when they move (no traffic logic; only cosmetic).
- Main JS bundle is 1.5 MB (Phaser); fine for now.
- Only 4 waiting spots for buyers plus 1 seller; no service customers (repairing a customer's own car) yet.
- Negotiation does not yet show the customer reacting to the specific car's upgrades in dialogue; buyers' wishes are shown only as car classes.

## Next steps (milestone plan, in priority order)

1. **M2 – Feel and content**: synthwave background music (procedural WebAudio loop), more dialogue variety (car-specific and upgrade-specific lines, archetype-specific reactions to tactics), buyers asking for specific features ("Hat der ein Kassettendeck?"), clearer onboarding hints (first-day tutorial arrows/tips).
2. **M3 – Service customers**: customers who bring their own car for repair/tuning at a fixed fee (uses the lift; time pressure). Also car-wash/detailing as a quick job.
3. **M4 – Deeper economy**: price tags on lot cars (buyers walk up to cars they like), dealer auction at the computer (buy cars without a seller, unlocked by tech), loans/debt from Onkel Sal's loan shark with game over at heavy debt, reputation that affects customer rate and mood.
4. **M5 – Visual upgrades**: second lift (workshop level), visible showroom cars inside the glass showroom, more building detail per level, characters with simple up/down poses, night neon glow.
5. **M6 – Balance and goals**: tune prices/costs with the bot test over 60+ days so the full imperium takes ~3–5 hours; track "max profit" highscore; end screen stats.
6. **M7 – Polish and release**: settings (volume), keyboard help overlay, GitHub Pages build, final full verification → set `Status: DONE`.

## How to build, run, and test

All commands from `game/`. Node 22 and Google Chrome are installed system-wide; nothing needed sudo.

```bash
npm install          # once (node_modules is gitignored)
npm run dev          # dev server at http://localhost:5173
npm run build        # typecheck + production build to dist/
npm test             # Vitest unit tests for the simulation (tests/unit)
npm run smoke        # needs a fresh build: serves dist/, drives the game in headless Chrome,
                     # checks ~16 steps and writes screenshots to tests/smoke/out/ (gitignored)
npm run check        # build + test + smoke
```

- The smoke test uses `playwright-core` with the system Chrome (`channel: 'chrome'`, SwiftShader WebGL). No browser download.
- Look at the screenshots in `tests/smoke/out/` with the Read tool to check visuals.
- Debug hooks for tests live in `src/debug.ts` (`window.__mm`: `newGame(seed)`, `advance(minutes)`, `spawn('buy'|'sell')`, `interact(target)`, `teleport(x,y)`, `menuTitle()`).

## Code map

- `src/sim/` – pure, deterministic simulation (no Phaser): `state.ts` (types), `game.ts` (new game, tick, end of day, save), `economy.ts` (values, modifiers), `customers.ts`, `negotiation.ts`, `workshop.ts`, `progression.ts`, `rng.ts`.
- `src/content/` – data and German text: car models, archetypes and their lines, negotiation lines, workshop repairs/upgrades, tech tree and buildings.
- `src/art/` – procedural pixel art (cars, characters, lot background, 5x5 pixel font) and Phaser texture helpers.
- `src/scenes/LotScene.ts` – the world: movement, collision, NPC walking, car driving, prompts. `layout.ts` holds all coordinates.
- `src/app.ts` – controller: all menus (office, computer, lift, cars, customers), HUD, day summary, save/load.
- `src/ui/` – DOM overlay (`ui.ts` menus/toasts/prompt, `negotiationPanel.ts`, `style.css`).

## Manual installation log

Nothing had to be installed manually in session 1. Already present on the machine: Node 22.22, npm 10.9, Google Chrome 152. npm packages are installed by `npm install` (registry access works).

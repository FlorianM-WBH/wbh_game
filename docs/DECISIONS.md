# Decisions

Decisions made without human input, with their reasons.

## 2026-10-23 – Session 1 (interactive setup session, decisions made by the agent)

- **Platform: browser game, TypeScript + Vite + Phaser 3.90.** Node 22 and Google Chrome are already on the machine, so nothing needs sudo. A browser build is trivial to share with students (static `dist/`, e.g. GitHub Pages). Phaser 3.90 rather than 4.x because 3.x is mature and its API is well known; nothing in this game needs Phaser 4.
- **Architecture: pure simulation in `src/sim/` (no Phaser imports), rendering in `src/scenes/`, menus/dialogs as a DOM overlay in `src/ui/`.** The sim is deterministic (seeded RNG stored in the state) and fully unit-testable with Vitest. DOM menus are easier to style (neon CSS), to read, and to drive from automated browser tests than canvas UI.
- **Testing: Vitest for the sim (including a "balance bot" that plays 14 days and must make a profit) plus a headless-Chrome smoke test (`playwright-core` with the system Chrome, `channel: 'chrome'`) that builds, serves, plays a few scripted steps through `window.__mm` debug hooks, checks for console errors and saves screenshots.** No browser download needed.
- **Language: German UI and dialogue** (the brief is German), with 80s Denglisch slang for flavour. Code, comments and docs in English.
- **Art: all procedural pixel art generated at runtime** (canvas drawing into textures), so no external assets or licences. Game resolution 640x360, scaled up crisp (`pixelArt: true`). Cars are top-down sprites built from shape parameters per model; characters are composed from layers (skin, hair style, top, pants, shades), so every customer looks different.
- **Car brands are parodies** (Ferrero Testosterossa, Lambo Kontrach, DeLorenzo, Porschke...) to fit the over-the-top tone and avoid trademarks. Money in US dollars (Miami 1986).
- **Time model:** a day runs 08:00–20:00 game time, about 2 game minutes per real second (~6 real minutes per day). Time pauses during menus and negotiations so the player is never punished for reading jokes. Rent is charged at closing.
- **Workplaces:** office door (finances, building upgrades, save, end day), office computer (tech tree), workshop lift (repairs/upgrades; jobs run on their own, holding the action key at the lift speeds them up ×3, so the free-moving player character has a reason to be there), buy-in zone (sellers park there), sales lot (parking slots).
- **Negotiation:** each customer has a hidden limit (max pay / min accept) and patience; the player names prices or accepts the counteroffer; tactics (charm, hard, exaggerate) can each be used once per negotiation and depend on customer personality. Mood shifts the effective limit. Insulting offers cost extra patience.
- **Goal / end:** "Imperium" = every tech and building level bought (progress shown as %). Profit and stats are tracked for "maximal Gewinn".

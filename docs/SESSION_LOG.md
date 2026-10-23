# Session log

Newest entries at the bottom.

## 2026-10-23 – Session 1 (interactive setup, owner present only for installs; none were needed)

- Chose the stack: TypeScript + Vite + Phaser 3.90, DOM overlay for UI, Vitest, and a headless Chrome smoke test via playwright-core using the system Chrome. Recorded the reasons in DECISIONS.md.
- Built M1, the playable vertical slice: deterministic simulation (cars, 10 customer archetypes, negotiation with tactics, workshop repairs and upgrades, tech tree, building upgrades, day cycle, rent, save/load), procedural pixel art for cars, characters and the lot, the lot scene with free movement and interactions, all workplace menus, the negotiation panel, sound effects.
- Verified: 13 unit tests including a 14-day balance bot; smoke test (16 checks: title, walking, E-interaction, customers, all menus, buying a car, lift repair, no console errors), and checked the screenshots by eye.
- Learned: Phaser's `JustDown` misses taps shorter than a frame (keyup clears it), so the scene listens to the key's `down` event instead. Fast-forwarding the sim in tests makes scene animations lag behind, which is expected.

## 2026-10-23 – Session 2 (autonomous)

- M2 (feel and content): procedural synthwave background music (`src/music.ts`) with separate sfx/music buses and persisted `M`/`N` toggles; buyer feature wishes with price effects and ★ markers; composed pitch lines (wish have/missing, praise for liked extras, condition remarks); archetype-specific tactic reactions for all 10 archetypes; first-steps tips box (6 steps, `H` hides).
- M3 (service customers): customers bring their own car for one paid job with a deadline; accept / haggle (+25%) / decline; lift menu for customer cars; tips for early hand-over; missed deadline = car and fee gone. Office shows the count of finished service jobs.
- Verified: 23 unit tests (new `tests/unit/content.test.ts`: wishes, content completeness, tips, the full service flow, fee > parts, missed deadline); smoke test now 25 checks including an offline render of the music (rms ~0.04, peak ~0.35), the tips box, a wish in the customer menu and the complete service flow; screenshots checked by eye.
- Learned: `page.evaluate(fn, arg)` silently passes `undefined` if the arg is forgotten, which looked like a sim bug. Vitest only picks up `tests/unit/**`, so throwaway analysis scripts must live there temporarily.

## 2026-10-23 – Session 3 (autonomous)

- **M4 deeper economy:** price tags with browsing buyers (speech-bubble rejections), dealer auction at the computer (new tech "BTX-Händlerauktion"), loan shark Tony with daily interest, automatic bailout and game over above $60k debt, reputation (0–5 stars) affecting customer rate and mood.
- **M5 visuals:** second lift bay with the workshop upgrade (parallel jobs), night lights, customers walking to their car and driving off, back-view character frames, showroom display cars and neon trim, tuning hall checkers.
- **M6 balance/goals:** human-like long-run bot plus pacing test (empire in 20–28 game days for the bot), records, richer victory stats, merged impatience toasts, victory check that does not depend on events.
- **M7 polish:** pause menu (Esc), settings with volume levels, help overlay (F1), title screen number keys, README, GitHub Pages workflow, soak test (`npm run soak`).
- Learned: running `npx prettier --write` without the project's style (single quotes, width 160) reformats whole files. Restore from git and re-apply edits instead. Prettier keeps objects expanded once it has split them, so reformatting with the right width does not undo the damage. `Phaser.Scene` already has a `lights` property; don't shadow it. Inserting a tutorial tip changes the bitmask of old saves; append instead.
- Status set to DONE: all milestones implemented, and build, unit tests, smoke test and soak test pass.

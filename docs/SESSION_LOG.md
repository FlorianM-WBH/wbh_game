# Session log

Newest entries at the bottom.

## 2026-10-23 – Session 1 (interactive setup, owner present only for installs; none were needed)

- Chose the stack: TypeScript + Vite + Phaser 3.90, DOM overlay for UI, Vitest, and a headless Chrome smoke test via playwright-core using the system Chrome. Recorded the reasons in DECISIONS.md.
- Built M1, the playable vertical slice: deterministic simulation (cars, 10 customer archetypes, negotiation with tactics, workshop repairs and upgrades, tech tree, building upgrades, day cycle, rent, save/load), procedural pixel art for cars, characters and the lot, the lot scene with free movement and interactions, all workplace menus, the negotiation panel, sound effects.
- Verified: 13 unit tests including a 14-day balance bot; smoke test (16 checks: title, walking, E-interaction, customers, all menus, buying a car, lift repair, no console errors), and checked the screenshots by eye.
- Learned: Phaser's `JustDown` misses taps shorter than a frame (keyup clears it), so the scene listens to the key's `down` event instead. Fast-forwarding the sim in tests makes scene animations lag behind, which is expected.

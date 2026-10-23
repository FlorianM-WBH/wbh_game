# Miami Motors '86

A 2D single-player browser game: you run a used-car lot in 1986 Miami. Buy cars from sellers (or at the dealer auction), repair and tune them on your lifts, and sell them to haggling customers – or hang a price tag on them. Take paid workshop jobs, grow your reputation, upgrade the buildings, unlock the tech tree, and try not to owe Tony "Zinsen" Calamari too much. Goal: the full empire (100 %), and as much profit as possible.

UI and dialogue are in German.

## Play

```bash
npm install
npm run dev      # http://localhost:5173
```

Controls: `WASD`/arrows walk, `E`/Space use (hold at a lift to help), `1`–`9`/arrows/Enter in menus, `Esc` back/pause, `F1` help, `M` sound, `N` music, `H` tips.

## Build and test

```bash
npm run build    # typecheck + static build in dist/ (relative paths, works from any folder)
npm test         # simulation unit tests incl. balance bots
npm run smoke    # headless Chrome run of the built game, screenshots in tests/smoke/out/
npm run check    # all of the above
```

`dist/` is a static site. `.github/workflows/pages.yml` publishes it to GitHub Pages on push to `main` (enable Pages with source "GitHub Actions" once).

Everything (graphics, music, sounds) is generated procedurally at runtime; there are no asset files.

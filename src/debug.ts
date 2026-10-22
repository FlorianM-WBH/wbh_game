// Hooks for automated tests (tests/smoke). Harmless in normal play.
import type Phaser from 'phaser';
import type { App, Target } from './app';
import { tick } from './sim/game';
import { spawnCustomer } from './sim/customers';
import type { Intent } from './sim/state';
import { analyseMusic } from './music';

export function installDebug(app: App, game: Phaser.Game): void {
  const lot = () => game.scene.getScene('lot') as unknown as { player: { x: number; y: number } };
  (window as unknown as { __mm: unknown }).__mm = {
    app,
    get state() {
      return app.state;
    },
    ready: true,
    newGame: (seed: number) => {
      app.ui.close();
      app.startNew(seed);
      app.ui.close();
    },
    teleport: (x: number, y: number) => {
      const p = lot().player;
      p.x = x;
      p.y = y;
    },
    interact: (t: Target) => app.interact(t),
    /** advance game time quickly without rendering every minute */
    advance: (minutes: number) => {
      for (let i = 0; i < minutes; i++) {
        tick(app.state, 1);
        app.flush();
      }
    },
    spawn: (intent: Intent) => {
      const c = spawnCustomer(app.state, intent);
      app.flush();
      return c?.id ?? null;
    },
    analyseMusic,
    menuTitle: () => (document.querySelector('[data-menu]') as HTMLElement | null)?.dataset.menu ?? null,
  };
}

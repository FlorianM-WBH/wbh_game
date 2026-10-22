import Phaser from 'phaser';
import './ui/style.css';
import { App } from './app';
import { UI } from './ui/ui';
import { LotScene } from './scenes/LotScene';
import { WORLD_H, WORLD_W } from './scenes/layout';
import { installDebug } from './debug';

const frame = document.getElementById('frame')!;
function fit(): void {
  const k = Math.min(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H);
  const w = Math.floor(WORLD_W * k);
  const h = Math.floor(WORLD_H * k);
  frame.style.width = `${w}px`;
  frame.style.height = `${h}px`;
  frame.style.setProperty('--u', `${w / 1000}px`);
}
fit();
window.addEventListener('resize', fit);

const ui = new UI(document.getElementById('ui')!);
const app = new App(ui);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WORLD_W,
  height: WORLD_H,
  pixelArt: true,
  backgroundColor: '#140a24',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.NO_CENTER },
  banner: false,
});
game.scene.add('lot', LotScene, true, { app });
game.events.once('lot-ready', () => {
  app.titleScreen();
  installDebug(app, game);
});

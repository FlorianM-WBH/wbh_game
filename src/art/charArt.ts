// Procedural 12x20 characters, front-facing, composed from look layers.
import type { HairStyle, TopStyle } from '../content/archetypes';
import { shade } from './carArt';

export const CHAR_W = 12;
export const CHAR_H = 20;

export interface CharLook {
  skin: string;
  hair: HairStyle;
  hairColor: string;
  top: TopStyle;
  topColor: string;
  pantsColor: string;
  shades: boolean;
  /** inner shirt colour for jackets */
  innerColor?: string;
  chain?: boolean;
}

/** Draw one frame at (x0, y0). frame 0 = standing, 1 = step. */
export function drawCharacter(ctx: CanvasRenderingContext2D, look: CharLook, x0: number, y0: number, frame: 0 | 1): void {
  const px = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x0 + x, y0 + y, w, h);
  };
  const skinD = shade(look.skin, -0.2);
  const hair = look.hairColor;
  const hairD = shade(hair, -0.3);
  const top = look.topColor;
  const topD = shade(top, -0.25);
  const pants = look.pantsColor;

  // shadow
  px(2, 19, 8, 1, 'rgba(10,0,30,0.35)');

  // hair behind the head
  if (look.hair === 'vokuhila') px(2, 3, 8, 7, hair);
  if (look.hair === 'surfer') px(2, 2, 8, 7, hair);
  if (look.hair === 'dauerwelle' || look.hair === 'stirnband') px(1, 0, 10, 9, hair);

  // head
  px(3, 2, 6, 6, look.skin);
  px(3, 7, 6, 1, skinD);
  // eyes / shades
  if (look.shades) {
    px(3, 4, 6, 1, '#101010');
    px(4, 4, 1, 1, '#5ad8ff');
  } else {
    px(4, 4, 1, 1, '#201010');
    px(7, 4, 1, 1, '#201010');
  }
  px(5, 6, 2, 1, shade(look.skin, -0.35)); // mouth

  // hair on top
  switch (look.hair) {
    case 'vokuhila':
      px(3, 1, 6, 2, hair);
      px(3, 1, 6, 1, hairD);
      break;
    case 'dauerwelle':
      px(2, 0, 8, 3, hair);
      px(2, 1, 1, 1, hairD);
      px(8, 2, 1, 1, hairD);
      break;
    case 'stirnband':
      px(2, 0, 8, 3, hair);
      px(2, 3, 8, 1, '#ff3cc8');
      break;
    case 'glatze':
      px(3, 1, 6, 1, look.skin);
      px(2, 3, 1, 2, hair);
      px(9, 3, 1, 2, hair);
      break;
    case 'flattop':
      px(3, 0, 6, 3, hair);
      px(3, 0, 6, 1, shade(hair, 0.2));
      break;
    case 'gegelt':
      px(3, 1, 6, 2, hair);
      px(4, 1, 3, 1, shade(hair, 0.4));
      break;
    case 'surfer':
      px(2, 1, 8, 2, hair);
      px(3, 3, 2, 1, hair);
      break;
    case 'dutt':
      px(3, 1, 6, 2, hair);
      px(5, -1 + 1, 2, 1, hair);
      px(4, 0, 4, 1, hairD);
      break;
  }

  // neck
  px(5, 8, 2, 1, skinD);

  // torso + arms
  const sleeve = look.top === 'tanktop' || look.top === 'body' ? look.skin : top;
  px(2, 9, 8, 5, top);
  px(1, 9, 1, 4, sleeve);
  px(10, 9, 1, 4, sleeve);
  px(1, 13, 1, 1, look.skin); // hands
  px(10, 13, 1, 1, look.skin);
  switch (look.top) {
    case 'hawaii':
      px(3, 10, 1, 1, '#fff3a0');
      px(6, 9, 1, 1, '#ff5a8a');
      px(8, 11, 1, 1, '#fff3a0');
      px(4, 12, 1, 1, '#ff5a8a');
      px(7, 13, 1, 1, '#fff3a0');
      break;
    case 'jackett':
      px(4, 9, 4, 5, look.innerColor ?? '#3cd8c8');
      px(4, 9, 1, 5, topD);
      px(7, 9, 1, 5, topD);
      break;
    case 'anzug':
      px(4, 9, 4, 3, '#f0f0f0');
      px(5, 9, 2, 4, '#c81e3c');
      break;
    case 'lederjacke':
      px(6, 9, 1, 5, '#a0a0a0');
      px(2, 9, 2, 1, topD);
      px(8, 9, 2, 1, topD);
      break;
    case 'polo':
      px(4, 9, 4, 1, shade(top, 0.3));
      break;
    case 'body':
      px(2, 13, 8, 1, '#ffe03c');
      break;
    case 'tanktop':
      px(3, 9, 1, 1, look.skin);
      px(8, 9, 1, 1, look.skin);
      break;
    case 'shirt':
      px(3, 11, 6, 1, topD);
      break;
  }
  if (look.chain) px(4, 9, 4, 1, '#ffd23c');

  // legs
  const legColor = look.top === 'body' ? top : pants;
  const legD = shade(legColor, -0.25);
  if (frame === 0) {
    px(3, 14, 3, 4, legColor);
    px(6, 14, 3, 4, legColor);
    px(6, 14, 1, 4, legD);
    px(3, 18, 3, 1, '#2a2020');
    px(6, 18, 3, 1, '#2a2020');
  } else {
    px(2, 14, 3, 4, legColor);
    px(7, 14, 3, 3, legColor);
    px(7, 14, 1, 3, legD);
    px(2, 18, 3, 1, '#2a2020');
    px(7, 17, 3, 1, '#2a2020');
  }
  if (look.top === 'body') {
    // leg warmers, obviously
    px(frame === 0 ? 3 : 2, 16, 3, 2, '#ff3cc8');
    px(frame === 0 ? 6 : 7, 16, 3, frame === 0 ? 2 : 1, '#3cf0e0');
  }
}

export const PLAYER_LOOK: CharLook = {
  skin: '#e8b48a',
  hair: 'gegelt',
  hairColor: '#8a5a2a',
  top: 'jackett',
  topColor: '#f5f5f0',
  innerColor: '#3cd8c8',
  pantsColor: '#f0ece0',
  shades: true,
  chain: true,
};

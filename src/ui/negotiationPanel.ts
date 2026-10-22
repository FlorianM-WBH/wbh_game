// The haggling screen.
import { ARCHETYPE_BY_ID } from '../content/archetypes';
import { CLASS_LABEL, MODEL_BY_ID } from '../content/models';
import { COMPONENTS, COMPONENT_LABEL } from '../content/workshop';
import { marketValue } from '../sim/economy';
import {
  TACTIC_LABEL,
  acceptOffer,
  abandonNegotiation,
  availableTactics,
  closeNegotiation,
  makeOffer,
  useTactic,
  type Tactic,
} from '../sim/negotiation';
import { carById, customerById, formatMoney, hasTech, type Car, type GameState } from '../sim/state';
import { esc, h, type UI } from './ui';

export interface NegotiationHooks {
  portrait: (customerId: number) => HTMLCanvasElement | null;
  onDone: () => void;
  sfx: (name: 'deal' | 'walkout' | 'click') => void;
}

function condWord(v: number): string {
  if (v >= 85) return 'top';
  if (v >= 60) return 'ordentlich';
  if (v >= 35) return 'müde';
  return 'Schrott';
}

export function conditionHtml(_s: GameState, car: Car, exact: boolean): string {
  return COMPONENTS.map((c) => {
    const v = car.cond[c];
    const cls = v >= 60 ? 'good' : v < 35 ? 'bad' : '';
    return `<span class="tag ${cls}">${COMPONENT_LABEL[c]}: ${exact ? `${Math.round(v)}%` : condWord(v)}</span>`;
  }).join('');
}

function moodFace(m: number): string {
  if (m >= 75) return '😍';
  if (m >= 55) return '🙂';
  if (m >= 35) return '😐';
  if (m >= 15) return '😠';
  return '🤬';
}

export function openNegotiation(ui: UI, s: GameState, hooks: NegotiationHooks): void {
  const n = s.negotiation!;
  const cust = customerById(s, n.customerId)!;
  const car = carById(s, n.carId)!;
  const model = MODEL_BY_ID[car.modelId];
  const arch = ARCHETYPE_BY_ID[cust.archetypeId];
  const sale = n.kind === 'sale';
  const value = marketValue(car);
  const exact = sale || hasTech(s, 'gutachter');

  let price = sale ? Math.round((value * 1.25) / 100) * 100 : Math.round((n.theirOffer * 0.55) / 100) * 100;

  const panel = h('div', 'panel interactive');
  panel.dataset.menu = 'negotiation';
  const portraitBox = h('div', '');
  const pc = hooks.portrait(cust.id);
  if (pc) {
    pc.className = 'portrait';
    portraitBox.append(pc);
  }
  const right = h('div', '');
  const grid = h('div', 'nego');
  grid.append(portraitBox, right);

  const title = h('h2', '', esc(cust.name));
  const sub = h('div', 'sub', `${esc(arch.label)} · ${sale ? 'will kaufen' : 'will verkaufen'}`);
  const carInfo = h(
    'div',
    'body',
    `<p><b>${esc(model.name)}</b> <span class="tag">${CLASS_LABEL[model.cls]}</span></p>` +
      `<p>${conditionHtml(s, car, exact)}</p>` +
      `<p>${
        sale
          ? `Marktwert ca. <b>${formatMoney(value)}</b> · Du hast <b>${formatMoney(car.invested)}</b> reingesteckt`
          : exact
            ? `Marktwert laut Gutachten: <b>${formatMoney(value)}</b>`
            : `Marktwert grob geschätzt: <b>${formatMoney(value * 0.8)} – ${formatMoney(value * 1.2)}</b>`
      }</p>`,
  );
  const meters = h('div', 'meters');
  const log = h('div', 'log');
  const priceRow = h('div', 'price-row');
  const btnRow = h('div', 'btn-row');
  right.append(title, sub, carInfo, meters, log);
  panel.append(grid, priceRow, btnRow);

  const btn = (label: string, cls: string, fn: () => void, key?: string) => {
    const b = h('button', `btn ${cls}`, (key ? `<span class="key">${key}</span>` : '') + esc(label));
    b.addEventListener('click', fn);
    return b;
  };

  const finished = () => n.result !== 'open';

  const render = () => {
    meters.innerHTML =
      `<span>Laune ${moodFace(n.mood)} <span class="bar" style="display:inline-block;vertical-align:middle"><i style="width:${n.mood}%"></i></span></span>` +
      `<span>Geduld ${'●'.repeat(Math.max(0, n.patience))}${'○'.repeat(Math.max(0, n.maxPatience - n.patience))}</span>` +
      `<span>Angebot ${sale ? 'Kunde' : 'Verkäufer'}: <b style="color:var(--yellow)">${formatMoney(n.theirOffer)}</b></span>` +
      `<span>Dein Geld: ${formatMoney(s.money)}</span>`;
    log.innerHTML = n.log.map((l) => `<div class="${l.who === 'player' ? 'p' : 'c'}">${esc(l.text)}</div>`).join('');
    log.scrollTop = log.scrollHeight;
    priceRow.innerHTML = '';
    btnRow.innerHTML = '';
    if (finished()) {
      const msg = n.result === 'deal' ? `<b class="good">DEAL! ${formatMoney(n.dealPrice ?? 0)}</b>` : `<b class="bad">Kein Deal.</b>`;
      priceRow.append(h('div', '', msg));
      btnRow.append(btn('Weiter', 'main', close, 'Enter'));
      return;
    }
    const step = (d: number) => () => {
      price = Math.max(0, price + d);
      hooks.sfx('click');
      render();
    };
    priceRow.append(
      btn('−1000', '', step(-1000), '↓'),
      btn('−100', '', step(-100), '←'),
      h('div', 'price', formatMoney(price)),
      btn('+100', '', step(100), '→'),
      btn('+1000', '', step(1000), '↑'),
    );
    const offerBtn = btn(sale ? 'Preis nennen' : 'Bieten', 'main', doOffer, 'Enter');
    offerBtn.disabled = !sale && price > s.money;
    const acceptBtn = btn(`Annehmen (${formatMoney(n.theirOffer)})`, '', doAccept, 'A');
    acceptBtn.disabled = !sale && n.theirOffer > s.money;
    btnRow.append(offerBtn, acceptBtn);
    availableTactics(s).forEach((t, i) => {
      const b = btn(TACTIC_LABEL[t], '', () => doTactic(t), String(i + 1));
      b.disabled = n.used.includes(t);
      btnRow.append(b);
    });
    btnRow.append(btn('Gehen', '', doAbandon, 'Esc'));
  };

  const after = () => {
    if (n.result === 'deal') hooks.sfx('deal');
    else if (n.result === 'walkout') hooks.sfx('walkout');
    render();
  };
  const doOffer = () => {
    if (!sale && price > s.money) return;
    makeOffer(s, price);
    after();
  };
  const doAccept = () => {
    acceptOffer(s);
    after();
  };
  const doTactic = (t: Tactic) => {
    if (n.used.includes(t)) return;
    useTactic(s, t);
    after();
  };
  const doAbandon = () => {
    abandonNegotiation(s);
    after();
  };
  function close() {
    closeNegotiation(s);
    ui.close();
    hooks.onDone();
  }

  render();
  ui.openCustom(panel, (e) => {
    if (e.repeat) return true;
    if (finished()) {
      if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ' || e.key === 'e') close();
      return true;
    }
    const k = e.key;
    if (k === 'ArrowLeft') step(-100);
    else if (k === 'ArrowRight') step(100);
    else if (k === 'ArrowUp') step(1000);
    else if (k === 'ArrowDown') step(-1000);
    else if (k === 'Enter') doOffer();
    else if (k === 'a' || k === 'A') doAccept();
    else if (k === 'Escape') doAbandon();
    else if (/^[1-3]$/.test(k)) {
      const t = availableTactics(s)[Number(k) - 1];
      if (t) doTactic(t);
    }
    return true;
  });

  function step(d: number) {
    price = Math.max(0, price + d);
    render();
  }
}

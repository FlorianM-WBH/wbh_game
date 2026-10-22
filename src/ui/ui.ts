// DOM overlay: HUD, interaction prompt, toasts, and modal menus.

export interface MenuOption {
  label: string;
  right?: string;
  desc?: string;
  disabled?: boolean;
  action: () => void;
}

export interface MenuSpec {
  title: string;
  sub?: string;
  body?: string;
  options: MenuOption[];
  closeLabel?: string;
  onClose?: () => void;
}

export function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html != null) el.innerHTML = html;
  return el;
}

export class UI {
  readonly root: HTMLElement;
  readonly hud: HTMLElement;
  private prompt: HTMLElement;
  private toasts: HTMLElement;
  private overlay: HTMLElement | null = null;
  private keyHandler: ((e: KeyboardEvent) => boolean) | null = null;
  private onCloseCurrent: (() => void) | null = null;
  private bubbles = new Map<string, HTMLElement>();

  constructor(root: HTMLElement) {
    this.root = root;
    this.hud = h('div', 'hud');
    this.prompt = h('div', 'prompt');
    this.prompt.style.display = 'none';
    this.toasts = h('div', 'toasts');
    const help = h('div', 'help', '<span class="key">WASD</span>/Pfeile laufen · <span class="key">E</span>/Leertaste benutzen (an der Hebebühne halten = mit anpacken) · <span class="key">M</span> Ton');
    root.append(this.hud, this.prompt, this.toasts, help);
    window.addEventListener('keydown', (e) => {
      if (this.keyHandler && this.keyHandler(e)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }

  get isOpen(): boolean {
    return this.overlay !== null;
  }

  setPrompt(text: string | null, x = 0, y = 0): void {
    if (!text || this.isOpen) {
      this.prompt.style.display = 'none';
      return;
    }
    this.prompt.style.display = 'block';
    this.prompt.style.left = `${x}px`;
    this.prompt.style.top = `${y}px`;
    if (this.prompt.dataset.text !== text) {
      this.prompt.dataset.text = text;
      this.prompt.innerHTML = `<kbd>E</kbd>${esc(text)}`;
    }
  }

  /** Small speech bubble above a world object; text null removes it. */
  setBubble(id: string, text: string | null, x = 0, y = 0): void {
    let b = this.bubbles.get(id);
    if (!text) {
      b?.remove();
      this.bubbles.delete(id);
      return;
    }
    if (!b) {
      b = h('div', 'bubble');
      this.root.insertBefore(b, this.prompt);
      this.bubbles.set(id, b);
    }
    if (b.textContent !== text) b.textContent = text;
    b.style.left = `${x}px`;
    b.style.top = `${y}px`;
  }

  toast(text: string, ms = 3500): void {
    const t = h('div', 'toast');
    t.textContent = text;
    this.toasts.append(t);
    while (this.toasts.children.length > 5) this.toasts.firstElementChild!.remove();
    setTimeout(() => t.remove(), ms);
  }

  close(): void {
    if (!this.overlay) return;
    this.overlay.remove();
    this.overlay = null;
    this.keyHandler = null;
    const cb = this.onCloseCurrent;
    this.onCloseCurrent = null;
    cb?.();
  }

  /** Open a modal with custom content. The key handler returns true when it used the key. */
  openCustom(panel: HTMLElement, keyHandler: (e: KeyboardEvent) => boolean, onClose?: () => void): void {
    this.overlay?.remove();
    this.overlay = h('div', 'overlay');
    this.overlay.append(panel);
    this.root.append(this.overlay);
    this.keyHandler = keyHandler;
    this.onCloseCurrent = onClose ?? null;
  }

  menu(spec: MenuSpec): void {
    const panel = h('div', 'panel interactive');
    panel.dataset.menu = spec.title;
    panel.append(h('h2', '', esc(spec.title)));
    if (spec.sub) panel.append(h('div', 'sub', esc(spec.sub)));
    if (spec.body) panel.append(h('div', 'body', spec.body));
    const opts = h('div', 'options');
    const all: MenuOption[] = [...spec.options, { label: spec.closeLabel ?? 'Zurück', action: () => this.close() }];
    const buttons: HTMLButtonElement[] = [];
    let sel = all.findIndex((o) => !o.disabled);
    all.forEach((o, i) => {
      const b = h('button', 'opt');
      const n = i === all.length - 1 ? 'Esc' : i < 9 ? String(i + 1) : '';
      b.innerHTML = `<span class="n">${n}</span><span class="l">${esc(o.label)}${o.desc ? `<span class="d">${esc(o.desc)}</span>` : ''}</span>${o.right ? `<span class="r">${esc(o.right)}</span>` : ''}`;
      b.disabled = !!o.disabled;
      b.addEventListener('click', () => o.action());
      buttons.push(b);
      opts.append(b);
    });
    const mark = () => buttons.forEach((b, i) => b.classList.toggle('sel', i === sel));
    mark();
    panel.append(opts);
    this.openCustom(
      panel,
      (e) => {
        if (e.repeat) return true;
        if (e.key === 'Escape') {
          this.close();
          return true;
        }
        const d = Number(e.key);
        if (Number.isInteger(d) && d >= 1 && d <= 9 && d <= all.length - 1) {
          if (!all[d - 1].disabled) all[d - 1].action();
          return true;
        }
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'ArrowUp' || e.key === 'w') {
          const dir = e.key === 'ArrowDown' || e.key === 's' ? 1 : -1;
          for (let k = 0; k < all.length; k++) {
            sel = (sel + dir + all.length) % all.length;
            if (!all[sel].disabled) break;
          }
          mark();
          buttons[sel].scrollIntoView({ block: 'nearest' });
          return true;
        }
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'e') {
          if (sel >= 0 && !all[sel].disabled) all[sel].action();
          return true;
        }
        return true; // swallow everything else while a menu is open
      },
      spec.onClose,
    );
  }
}

// Onkel Sal's loan shark: borrow money, pay daily interest, and don't let the debt get out of hand.
import { emit, formatMoney, type GameState } from './state';
import type { ActionResult } from './workshop';

/** Most you can borrow on your own (the shark's own bailouts can go beyond this). */
export const CREDIT_LIMIT = 40000;
/** Debt above this at closing time ends the game. */
export const GAME_OVER_DEBT = 60000;
/** Debt above this triggers warnings. */
export const WARN_DEBT = 40000;
export const DAILY_INTEREST = 0.03;
/** Fee on top when the shark has to cover a negative balance at closing. */
export const BAILOUT_FEE = 0.2;

export function debt(s: GameState): number {
  return s.debt ?? 0;
}

export function borrow(s: GameState, amount: number): ActionResult {
  if (amount <= 0) return { ok: false, reason: 'Wie viel denn?' };
  if (debt(s) + amount > CREDIT_LIMIT)
    return {
      ok: false,
      reason: `Tony leiht dir höchstens ${formatMoney(CREDIT_LIMIT)}.`,
    };
  s.debt = debt(s) + amount;
  s.money += amount;
  emit(s, {
    type: 'toast',
    text: `Kredit: +${formatMoney(amount)}. Zinsen ${Math.round(DAILY_INTEREST * 100)}% pro Tag.`,
  });
  return { ok: true };
}

export function repay(s: GameState, amount: number): ActionResult {
  amount = Math.min(amount, debt(s));
  if (amount <= 0) return { ok: false, reason: 'Du schuldest Tony nichts.' };
  if (s.money < amount) return { ok: false, reason: 'Nicht genug Geld.' };
  s.money -= amount;
  s.debt = debt(s) - amount;
  emit(s, {
    type: 'toast',
    text: s.debt > 0 ? `Zurückgezahlt: ${formatMoney(amount)}.` : 'Schuldenfrei! Tony ist fast enttäuscht.',
  });
  return { ok: true };
}

/** At closing: interest, then cover a negative balance with a pricey bailout; game over at heavy debt. */
export function settleDebt(s: GameState): {
  interest: number;
  bailout: number;
} {
  const interest = Math.ceil(debt(s) * DAILY_INTEREST);
  s.debt = debt(s) + interest;
  let bailout = 0;
  if (s.money < 0) {
    bailout = Math.ceil(-s.money * (1 + BAILOUT_FEE));
    s.debt += bailout;
    s.money = 0;
  }
  if (s.debt > GAME_OVER_DEBT) {
    s.over = true;
    emit(s, { type: 'gameOver', debt: s.debt });
  }
  return { interest, bailout };
}

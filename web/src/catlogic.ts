// Cat Clicker economy — the Kiwi Clicker loop, fully cat-themed.
// Click the cream cat → earn Purrs. Purrs pack into Sacks. Sacks pass the
// scanner and are sold to the orange KING CAT for Coins. Coins buy upgrades
// in three skill trees. Deliver enough sacks and the story ENDS (for real).

export const PURRS_PER_SACK = 100;
export const GOAL_SACKS = 100; // the King's Feast — the narrative ending

export type Tree = "archery" | "alchemy" | "carpentry";

export interface TreeInfo {
  name: string;
  emoji: string;
  blurb: string;
  /** effect description per level */
  effect: string;
}

export const TREES: Record<Tree, TreeInfo> = {
  archery: { name: "Archery", emoji: "🏹", blurb: "Active clicking", effect: "+1 purr per click, per level" },
  alchemy: { name: "Alchemy", emoji: "⚗️", blurb: "Resource crafting", effect: "+1 coin per sack sold, per level" },
  carpentry: { name: "Carpentry", emoji: "🪚", blurb: "Automation", effect: "+1 worker cat (auto-purrs), per level" },
};

export const MAX_LEVEL = 5;

/** coin cost of the NEXT level for a tree at `level` */
export function treeCost(level: number): number {
  return [5, 12, 25, 45, 80][level] ?? Infinity;
}

export interface CatState {
  purrs: number;          // loose purrs, not yet packed
  sacks: number;          // packed sacks waiting to be sold
  sacksDelivered: number; // sold to the King — the win counter
  coins: number;
  clicks: number;
  levels: Record<Tree, number>;
  finished: boolean;      // reached the King's Feast at least once
}

export function initialState(): CatState {
  return {
    purrs: 0, sacks: 0, sacksDelivered: 0, coins: 0, clicks: 0,
    levels: { archery: 0, alchemy: 0, carpentry: 0 },
    finished: false,
  };
}

export function clickPower(s: CatState): number {
  return 1 + s.levels.archery;
}

export function workerRate(s: CatState): number {
  return s.levels.carpentry; // purrs per second from worker cats
}

export function sackValue(s: CatState): number {
  return 2 + s.levels.alchemy; // coins per sack
}

/** One cat click. */
export function doClick(s: CatState): CatState {
  return pack({ ...s, purrs: s.purrs + clickPower(s), clicks: s.clicks + 1 });
}

/** Idle tick: worker cats purr on their own. */
export function tick(s: CatState, dt: number): CatState {
  const rate = workerRate(s);
  if (rate <= 0) return s;
  return pack({ ...s, purrs: s.purrs + rate * dt });
}

/** Worker cats auto-pack full sacks. */
function pack(s: CatState): CatState {
  if (s.purrs < PURRS_PER_SACK) return s;
  const newSacks = Math.floor(s.purrs / PURRS_PER_SACK);
  return { ...s, purrs: s.purrs - newSacks * PURRS_PER_SACK, sacks: s.sacks + newSacks };
}

/** Sell every waiting sack to the King (through the scanner). */
export function sellToKing(s: CatState): CatState {
  if (s.sacks <= 0) return s;
  const delivered = s.sacksDelivered + s.sacks;
  return {
    ...s,
    coins: s.coins + s.sacks * sackValue(s),
    sacksDelivered: delivered,
    sacks: 0,
    finished: s.finished || delivered >= GOAL_SACKS,
  };
}

export function buyLevel(s: CatState, tree: Tree): CatState {
  const lvl = s.levels[tree];
  const cost = treeCost(lvl);
  if (lvl >= MAX_LEVEL || s.coins < cost) return s;
  return { ...s, coins: s.coins - cost, levels: { ...s.levels, [tree]: lvl + 1 } };
}

// ── persistence ────────────────────────────────────────────────────────────────
const KEY = "catclicker_save";

export function loadState(): CatState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState();
    const s = JSON.parse(raw) as CatState;
    return { ...initialState(), ...s, levels: { ...initialState().levels, ...s.levels } };
  } catch {
    return initialState();
  }
}

export function saveState(s: CatState): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* full/blocked — ignore */ }
}

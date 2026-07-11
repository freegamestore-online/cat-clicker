import { GameShell, GameTopbar } from "@freegamestore/games";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  GOAL_SACKS, MAX_LEVEL, PURRS_PER_SACK, TREES, type Tree,
  buyLevel, clickPower, doClick, loadState, sackValue, saveState, sellToKing, tick, treeCost, workerRate,
} from "./catlogic";

// Cat Clicker — Kiwi Clicker's chaotic supply-chain loop, fully cat-themed:
// click the CREAM cat to harvest Purrs, worker cats pack them into sacks,
// sacks pass the scanner and are sold to the orange KING CAT. Three skill
// trees (Archery / Alchemy / Carpentry) and a real narrative ending.

interface FloatingPurr { id: number; x: number; y: number; amount: number }

export default function App() {
  const [state, setState] = useState(loadState);
  const [floats, setFloats] = useState<FloatingPurr[]>([]);
  const [squish, setSquish] = useState(false);
  const [selling, setSelling] = useState(false);
  const [showEnding, setShowEnding] = useState(false);
  const endedRef = useRef(loadState().finished);
  const floatId = useRef(0);

  // idle loop: worker cats purr on their own; save once a second
  useEffect(() => {
    const iv = setInterval(() => {
      setState((s) => {
        const ns = tick(s, 1);
        saveState(ns);
        return ns;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // the King's Feast — fire the ending exactly once per save
  useEffect(() => {
    if (state.finished && !endedRef.current) {
      endedRef.current = true;
      setShowEnding(true);
    }
  }, [state.finished]);

  const onCatClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setState((s) => doClick(s));
    setSquish(true);
    setTimeout(() => setSquish(false), 120);
    const pt = "touches" in e ? e.touches[0] : e;
    if (pt) {
      const id = ++floatId.current;
      setFloats((f) => [...f.slice(-8), { id, x: pt.clientX, y: pt.clientY, amount: clickPower(stateRefValue.current) }]);
      setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 900);
    }
  }, []);

  // ref mirror so the float amount is fresh without re-creating the handler
  const stateRefValue = useRef(state);
  stateRefValue.current = state;

  const onSell = useCallback(() => {
    if (state.sacks <= 0 || selling) return;
    setSelling(true);
    // little scanner moment before the coins arrive
    setTimeout(() => {
      setState((s) => {
        const ns = sellToKing(s);
        saveState(ns);
        return ns;
      });
      setSelling(false);
    }, 700);
  }, [state.sacks, selling]);

  const onBuy = useCallback((tree: Tree) => {
    setState((s) => {
      const ns = buyLevel(s, tree);
      saveState(ns);
      return ns;
    });
  }, []);

  const purrPct = Math.min(100, (state.purrs / PURRS_PER_SACK) * 100);
  const goalPct = Math.min(100, (state.sacksDelivered / GOAL_SACKS) * 100);

  return (
    <GameShell topbar={<GameTopbar title="Cat Clicker" score={state.coins} />}>
      <div className="flex flex-col h-full overflow-hidden select-none" style={{ background: "linear-gradient(180deg,#fdf6ec,#fbe8d3)" }}>

        {/* King's Feast progress */}
        <div className="px-3 pt-2 flex-shrink-0">
          <div className="flex justify-between text-xs font-bold" style={{ color: "#7c5c3a" }}>
            <span>👑 The King's Feast</span>
            <span>{state.sacksDelivered}/{GOAL_SACKS} sacks</span>
          </div>
          <div className="rounded-full overflow-hidden mt-1" style={{ height: 8, background: "#f3d9b8" }}>
            <div style={{ width: `${goalPct}%`, height: "100%", background: "linear-gradient(90deg,#f59e0b,#ea580c)", transition: "width 0.4s" }} />
          </div>
        </div>

        {/* main row: cat + king pipeline */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-0">
          <div className="text-sm font-bold" style={{ color: "#7c5c3a" }}>
            😺 {Math.floor(state.purrs)} purrs · +{clickPower(state)}/click{workerRate(state) > 0 ? ` · +${workerRate(state)}/s from ${workerRate(state)} worker cat${workerRate(state) > 1 ? "s" : ""} 🐈‍⬛` : ""}
          </div>

          {/* THE CREAM CAT */}
          <button
            onMouseDown={onCatClick}
            onTouchStart={(e) => { e.preventDefault(); onCatClick(e); }}
            className="rounded-full cursor-pointer flex items-center justify-center"
            style={{
              width: 190, height: 190,
              background: "radial-gradient(circle at 35% 30%, #fff7e8, #f7e3bf)",
              border: "6px solid #eecea0",
              boxShadow: "0 10px 40px rgba(180,130,60,0.35)",
              fontSize: 110,
              transform: squish ? "scale(0.92)" : "scale(1)",
              transition: "transform 0.1s",
            }}
            aria-label="Click the cat"
          >
            🐈
          </button>

          {/* purr → sack meter */}
          <div className="w-full max-w-xs px-4">
            <div className="flex justify-between text-xs font-semibold" style={{ color: "#a07b4f" }}>
              <span>packing next sack…</span><span>{Math.floor(state.purrs)}/{PURRS_PER_SACK}</span>
            </div>
            <div className="rounded-full overflow-hidden mt-0.5" style={{ height: 6, background: "#f3d9b8" }}>
              <div style={{ width: `${purrPct}%`, height: "100%", background: "#22c55e", transition: "width 0.15s" }} />
            </div>
          </div>

          {/* sacks + scanner + king */}
          <div className="flex items-center gap-3 mt-1">
            <div className="flex flex-col items-center">
              <span style={{ fontSize: 34 }}>🛍️</span>
              <span className="text-xs font-bold" style={{ color: "#7c5c3a" }}>{state.sacks} sack{state.sacks !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex flex-col items-center px-3 py-1 rounded-xl" style={{ background: selling ? "#dbeafe" : "#f5ead9", border: "2px dashed #d9b98c" }}>
              <span style={{ fontSize: 22 }}>{selling ? "📡" : "🛃"}</span>
              <span className="text-[10px] font-bold" style={{ color: "#7c5c3a" }}>{selling ? "scanning…" : "scanner"}</span>
            </div>
            <div className="flex flex-col items-center relative">
              <span className="absolute -top-3" style={{ fontSize: 20 }}>👑</span>
              <span style={{ fontSize: 40, filter: "hue-rotate(-20deg) saturate(2.2)" }}>🐈</span>
              <span className="text-xs font-bold" style={{ color: "#c2570b" }}>King Cat</span>
            </div>
          </div>

          <button
            onClick={onSell}
            disabled={state.sacks <= 0 || selling}
            className="px-6 py-2.5 rounded-2xl font-bold text-white cursor-pointer active:scale-95 transition-all"
            style={{
              background: state.sacks > 0 ? "linear-gradient(135deg,#f59e0b,#ea580c)" : "#d6c3a8",
              minHeight: 44, opacity: selling ? 0.6 : 1,
            }}
          >
            {selling ? "Passing the scanner…" : `Sell ${state.sacks || ""} sack${state.sacks !== 1 ? "s" : ""} to the King (+${state.sacks * sackValue(state)}🪙)`}
          </button>
        </div>

        {/* skill trees */}
        <div className="flex-shrink-0 px-2 pb-2">
          <div className="text-center text-xs font-bold mb-1" style={{ color: "#7c5c3a" }}>🪙 {state.coins} coins — Skiwitrees (cat edition)</div>
          <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
            {(Object.keys(TREES) as Tree[]).map((t) => {
              const info = TREES[t];
              const lvl = state.levels[t];
              const cost = treeCost(lvl);
              const maxed = lvl >= MAX_LEVEL;
              const afford = !maxed && state.coins >= cost;
              return (
                <button
                  key={t}
                  onClick={() => onBuy(t)}
                  disabled={!afford}
                  className="flex flex-col items-center gap-0.5 rounded-2xl p-2 cursor-pointer active:scale-95 transition-all"
                  style={{
                    background: "#fffaf1", border: `2px solid ${afford ? "#f59e0b" : "#ecd9bc"}`,
                    opacity: maxed ? 0.85 : afford ? 1 : 0.6, minHeight: 78,
                  }}
                >
                  <span style={{ fontSize: 22 }}>{info.emoji}</span>
                  <span className="text-xs font-bold" style={{ color: "#7c5c3a" }}>{info.name} {"★".repeat(lvl)}</span>
                  <span className="text-[10px] text-center leading-tight" style={{ color: "#a07b4f" }}>{info.effect}</span>
                  <span className="text-[11px] font-bold" style={{ color: maxed ? "#16a34a" : "#c2570b" }}>
                    {maxed ? "MAX" : `${cost}🪙`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* floating +purrs */}
        {floats.map((f) => (
          <span key={f.id} className="fixed pointer-events-none font-bold"
            style={{ left: f.x - 10, top: f.y - 30, color: "#16a34a", fontSize: 18, animation: "floatUp 0.9s ease-out forwards" }}>
            +{f.amount}
          </span>
        ))}
        <style>{`@keyframes floatUp { from { opacity: 1; transform: translateY(0);} to { opacity: 0; transform: translateY(-46px);} }`}</style>

        {/* narrative ending */}
        {showEnding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(60,35,10,0.75)" }}>
            <div className="rounded-3xl p-6 text-center max-w-sm" style={{ background: "#fffaf1" }}>
              <div style={{ fontSize: 56 }}>👑🐈🎉</div>
              <h2 className="text-2xl font-bold mt-2" style={{ fontFamily: "Fraunces, serif", color: "#7c2d12" }}>
                The King's Feast is complete!
              </h2>
              <p className="text-sm mt-2" style={{ color: "#7c5c3a" }}>
                {GOAL_SACKS} sacks of purrs delivered. The orange King Cat purrs louder than
                anyone has ever purred, declares your cream cat the Royal Purr-veyor, and the
                whole empire naps happily ever after. 😴
              </p>
              <p className="text-xs mt-2" style={{ color: "#a07b4f" }}>({state.clicks.toLocaleString()} clicks — what an empire!)</p>
              <button
                onClick={() => setShowEnding(false)}
                className="mt-4 px-6 py-2.5 rounded-2xl font-bold text-white cursor-pointer"
                style={{ background: "#ea580c", minHeight: 44 }}
              >
                Keep playing 🐾
              </button>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
}

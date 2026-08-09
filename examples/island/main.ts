// ============================================================================
// Example: island — a DOM element glued to a world-space rect (guide §5e).
//
// Text is the one place a canvas UI should surrender to the browser: caret,
// selection, IME, clipboard. The `island` facet does the surrendering without
// giving up the world: a part reports { el, rect } each frame, and the runtime
// pins the element over that rect through every pan and zoom with a single
// top-left-origin translate+scale. The element keeps its WORLD size and the
// transform scales it, so text wraps identically at every zoom level.
//
// The card below is an ordinary draggable part; its text field is a real
// <input> riding an island. Drag the card, pan the grid, zoom the wheel —
// the input tracks like paint, and typing works the whole time (the runtime
// ignores window keys aimed at editable DOM). The input dispatches on every
// keystroke, and `AppSpec.onCommit` — the embedding seam — reports each
// committed doc change to the status line at the bottom.
// ============================================================================

import {
  at, calpha, Free, hsl, Label, mount, Pan, part, rect, Stack, v, Vec,
} from "gratify";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";

// ── State ─────────────────────────────────────────────────────────────────────

interface Doc { pos: Vec; text: string; }

type Intent =
  | { kind: "move"; pos: Vec }
  | { kind: "text"; text: string };

function update(doc: Doc, intent: Intent): Doc {
  switch (intent.kind) {
    case "move": return { ...doc, pos: intent.pos };
    case "text": return { ...doc, text: intent.text };
  }
}

// ── The island element — created ONCE; identity is stable across frames. ──────

const input = document.createElement("input");
input.value = "type while the world moves";
input.spellcheck = false;
input.style.cssText =
  "box-sizing:border-box;border:1px solid #4a5268;border-radius:6px;" +
  "background:#191c26;color:#e8ecf6;padding:0 9px;font:13px 'Segoe UI',system-ui;" +
  "outline:none;";
input.addEventListener("focus", () => (input.style.borderColor = "#40baff"));
input.addEventListener("blur", () => (input.style.borderColor = "#4a5268"));

// ── The card — a draggable part whose text field is the island. ───────────────

interface CardProps { pos: Vec; text: string; }

const Card = part("card")
  .props<CardProps>()
  .size(() => v(250, 108))
  .style((t, ch) => ({
    fill: t.mix(t.surface, t.surfaceHi, 0.35 * ch.hover + 0.5 * ch.drag),
    edge: t.mix(t.muted, t.accent, 0.5 * ch.hover + 0.5 * ch.drag),
    text: t.text,
    dim: calpha(t.text, 0.55),
    lift: 3 * ch.drag,
  }))
  .render((node, paint, s) => {
    const r = node.rect.raise(s.lift);
    paint.box(r, 10, s.fill, s.edge, 1.2);
    paint.box(rect(r.x, r.y, r.w, 6), 3, hsl(203, 0.7, 0.55));   // header stripe
    paint.label("island card — drag me", v(r.x + 12, r.y + 22), s.text, { align: "left", weight: 600, size: 13 });
    // The canvas reads the SAME doc the input writes — the round trip is live.
    paint.label(`canvas sees: ${node.props.text}`, v(r.x + 12, r.bottom - 14), s.dim, { align: "left", size: 11 });
  })
  // The facet: the input lives over this world rect. That's the whole API.
  .island((node) => ({
    el: input,
    rect: rect(node.rect.x + 12, node.rect.y + 34, node.rect.w - 24, 28),
  }))
  .gesture({
    begin: (node, p) => ({ grab: v(p.x - node.props.pos.x, p.y - node.props.pos.y) }),
    during: (s, _node, p): Intent => ({ kind: "move", pos: v(p.x - s.grab.x, p.y - s.grab.y) }),
  });

// ── The surface — pannable, zoomable, dotted. ─────────────────────────────────

const Surface = part("surface")
  .props<Record<string, never>>()
  .fill()
  .hit(() => true)
  .style((t) => ({ dot: calpha(t.muted, 0.35) }))
  .render((node, paint, s) => {
    const view = node.view!, SPACING = 28;
    const left = Math.floor(-view.pan.x / view.zoom / SPACING) * SPACING;
    const top = Math.floor(-view.pan.y / view.zoom / SPACING) * SPACING;
    for (let x = left; x <= (view.w - view.pan.x) / view.zoom; x += SPACING)
      for (let y = top; y <= (view.h - view.pan.y) / view.zoom; y += SPACING)
        paint.dot(v(x, y), 1, s.dot);
  })
  .on(Pan());

// ── View ──────────────────────────────────────────────────────────────────────

function view(doc: Doc) {
  return Surface("root", {}, [
    Free("world", {}, [
      at(Stack("hint", { gap: 4, pad: 0 }, [
        Label("l1", { text: "island — DOM glued to the world", size: 17, weight: 600, bright: true }),
        Label("l2", { text: "drag the card · drag empty space to pan · wheel to zoom · keep typing", dim: true }),
      ]), v(40, 34)),
      at(Card("card", { pos: doc.pos, text: doc.text }), doc.pos),
    ]),
  ]);
}

// ── Mount — with onCommit, the embedding seam. ────────────────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;
const status = document.getElementById("status")!;
let commits = 0;

const rt = mount(canvas, {
  init: { pos: v(140, 120), text: input.value } as Doc,
  update,
  view,
  // Called after every committed update (the doc actually changed) — the hook
  // an embedding host uses to persist / re-evaluate, without wrapping dispatch.
  onCommit(doc: Doc) {
    commits++;
    status.textContent = `onCommit #${commits} — pos (${Math.round(doc.pos.x)}, ${Math.round(doc.pos.y)}) · text "${doc.text}"`;
  },
});

input.addEventListener("input", () => rt.dispatch({ kind: "text", text: input.value }));

attachSourcePanel([{ name: "main.ts", code: mainSource }]);

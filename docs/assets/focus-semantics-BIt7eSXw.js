import{p as s,v as r,F as p,d as a,l as u,m as d,S as m,L as i,R as h}from"./runtime-oXwbMIQ9.js";import{a as v}from"./source-panel-CSqvtNlY.js";const b=`// ============================================================================
// Example: focus-semantics — the three upstream-B seams on one page.
//
//   1. Focus model — every control here is Focusable(). Tab / Shift-Tab walk
//      them in document order (wrapping); Enter or Space presses the focused
//      one; Escape releases focus; clicking focuses what you clicked. The
//      ring you see is just the automatic \`focus\` channel driving the style.
//
//   2. Adorn z-tiers — every card carries an untiered corner badge (tier 0)
//      and a hover/focus tooltip lifted to tier 2 with \`tier(el, 2)\`. Hover a
//      card in the MIDDLE of the row: without tiers its tooltip would paint
//      under the next card's badge; with tiers it reliably sits above all of
//      them.
//
//   3. Semantics slot — each part declares \`.semantics()\` (role/label/value);
//      the panel on the right prints \`rt.semanticsTree()\` live. Pure data —
//      no DOM mirroring, no ARIA — the slot a future accessibility layer
//      builds on.
// ============================================================================

import {
  at, Focusable, Label, mount, part, Row, Stack,
  tier, v, type SemanticsNode,
} from "gratify";

import { attachSourcePanel } from "../shared/source-panel";
import mainSource from "./main.ts?raw";

// ── State ─────────────────────────────────────────────────────────────────────

interface Doc {
  volume: number;
  muted: boolean;
  presses: number;
}

type Intent =
  | { kind: "vol"; delta: number }
  | { kind: "mute" }
  | { kind: "ping" };

const update = (d: Doc, i: Intent): Doc =>
  i.kind === "vol" ? { ...d, volume: Math.max(0, Math.min(10, d.volume + i.delta)) }
  : i.kind === "mute" ? { ...d, muted: !d.muted }
  : { ...d, presses: d.presses + 1 };

// ── A focusable card with a tiered tooltip + an untiered badge ────────────────

const Tooltip = part("fsx-tooltip")
  .props<{ text: string }>()
  .size((p, m) => v(m.text(p.text, 12).x + 18, 24))
  .style((t) => ({ fill: t.surfaceHi, edge: t.accent, text: t.textBright }))
  .render((n, p, s) => {
    p.box(n.rect, 6, s.fill, s.edge, 1);
    p.label(n.props.text, n.rect.center, s.text, { size: 12 });
  });

const Badge = part("fsx-badge")
  .props<{ text: string }>()
  .intrinsic(22, 22)
  .style((t) => ({ fill: t.accent2, text: t.textBright }))
  .render((n, p, s) => {
    p.box(n.rect, 11, s.fill);
    p.label(n.props.text, n.rect.center, s.text, { size: 11, weight: 600 });
  });

const Card = part("fsx-card")
  .props<{ label: string; value: string; tip: string; to: Intent; role: string }>()
  .intrinsic(128, 64)
  .style((t, ch) => ({
    fill: t.mix(t.surface, t.surfaceHi, ch.hover),
    edge: t.mix(t.muted, t.accent, Math.max(ch.focus, ch.press)),
    ring: ch.focus,
    text: t.mix(t.text, t.textBright, ch.hover + ch.focus),
    dim: t.textDim,
    show: Math.max(ch.hover, ch.focus),
  }))
  .render((n, p, s) => {
    p.box(n.rect, 10, s.fill, s.edge, 1 + 1.5 * s.ring);
    p.label(n.props.label, v(n.rect.center.x, n.rect.y + 22), s.dim, { size: 12 });
    p.label(n.props.value, v(n.rect.center.x, n.rect.y + 44), s.text, { size: 15, weight: 600 });
  })
  .on(Focusable())
  .press((n) => n.props.to)
  .semantics((n) => ({ role: n.props.role, label: n.props.label, value: n.props.value }))
  // tier 0 (default): a corner badge — stays under any sibling's tooltip
  .adorn((n) => [at(Badge("badge", { text: "•" }), v(n.rect.right - 11, n.rect.y - 11))])
  // tier 2: the tooltip — reliably above EVERY card's badge, whoever owns it
  .adorn((n) => n.ch.hover > 0.4 || n.ch.focus > 0.4
    ? [tier(at(Tooltip("tip", { text: n.props.tip }), v(n.rect.x + 8, n.rect.y - 30)), 2)]
    : []);

// ── View ──────────────────────────────────────────────────────────────────────

const Root = part("fsx-root")
  .props<Record<string, never>>()
  .render(() => {})
  .semantics(() => ({ role: "group", label: "mixer" }));

const view = (d: Doc) =>
  Root("root", {}, [Stack("col", { gap: 18, pad: 48 }, [
    Label("title", { text: "Tab / Shift-Tab cycle focus · Enter or Space presses · Escape releases", size: 15, weight: 600, bright: true }),
    Label("hint", { text: "Hover or focus a middle card: its tooltip (tier 2) paints above the neighbors' badges (tier 0).", size: 12 }),
    Row("cards", { gap: 14 }, [
      Card("vol-down", { label: "volume −", value: \`\${d.volume}\`, tip: "Enter: lower volume", to: { kind: "vol", delta: -1 }, role: "button" }),
      Card("vol-up", { label: "volume +", value: \`\${d.volume}\`, tip: "Enter: raise volume", to: { kind: "vol", delta: +1 }, role: "button" }),
      Card("mute", { label: "mute", value: d.muted ? "ON" : "off", tip: "Enter: toggle mute", to: { kind: "mute" }, role: "switch" }),
      Card("ping", { label: "pressed", value: \`\${d.presses}×\`, tip: "Enter: just counts", to: { kind: "ping" }, role: "button" }),
    ]),
  ])]);

// ── Mount + live semantics panel ──────────────────────────────────────────────

const canvas = document.getElementById("c") as HTMLCanvasElement;
const rt = mount(canvas, { init: { volume: 5, muted: false, presses: 0 }, update, view });

// The semantics tree, printed live. THIS is the deliverable: a queryable
// data structure (role/label/value + key path + rect) a future accessibility
// layer can mirror to DOM/ARIA — the example only pretty-prints it.
const panel = document.getElementById("sem")!;
const fmt = (nodes: SemanticsNode[], depth: number): string =>
  nodes.map((n) =>
    \`\${"  ".repeat(depth)}<b>\${n.role ?? "?"}</b> \${n.label ?? ""}\` +
    (n.value !== undefined ? \` = \${n.value}\` : "") +
    \`  <span style="opacity:.55">(\${Math.round(n.rect.x)},\${Math.round(n.rect.y)} \${Math.round(n.rect.w)}×\${Math.round(n.rect.h)})</span>\\n\` +
    fmt(n.children, depth + 1),
  ).join("");
const refresh = () => { panel.innerHTML = \`rt.semanticsTree()\\n\\n\${fmt(rt.semanticsTree(), 0)}\`; };
refresh();
setInterval(refresh, 250);

attachSourcePanel([{ name: "main.ts", code: mainSource }]);
`,x=(e,t)=>t.kind==="vol"?{...e,volume:Math.max(0,Math.min(10,e.volume+t.delta))}:t.kind==="mute"?{...e,muted:!e.muted}:{...e,presses:e.presses+1},g=s("fsx-tooltip").props().size((e,t)=>r(t.text(e.text,12).x+18,24)).style(e=>({fill:e.surfaceHi,edge:e.accent,text:e.textBright})).render((e,t,n)=>{t.box(e.rect,6,n.fill,n.edge,1),t.label(e.props.text,e.rect.center,n.text,{size:12})}),f=s("fsx-badge").props().intrinsic(22,22).style(e=>({fill:e.accent2,text:e.textBright})).render((e,t,n)=>{t.box(e.rect,11,n.fill),t.label(e.props.text,e.rect.center,n.text,{size:11,weight:600})}),o=s("fsx-card").props().intrinsic(128,64).style((e,t)=>({fill:e.mix(e.surface,e.surfaceHi,t.hover),edge:e.mix(e.muted,e.accent,Math.max(t.focus,t.press)),ring:t.focus,text:e.mix(e.text,e.textBright,t.hover+t.focus),dim:e.textDim,show:Math.max(t.hover,t.focus)})).render((e,t,n)=>{t.box(e.rect,10,n.fill,n.edge,1+1.5*n.ring),t.label(e.props.label,r(e.rect.center.x,e.rect.y+22),n.dim,{size:12}),t.label(e.props.value,r(e.rect.center.x,e.rect.y+44),n.text,{size:15,weight:600})}).on(p()).press(e=>e.props.to).semantics(e=>({role:e.props.role,label:e.props.label,value:e.props.value})).adorn(e=>[a(f("badge",{text:"•"}),r(e.rect.right-11,e.rect.y-11))]).adorn(e=>e.ch.hover>.4||e.ch.focus>.4?[u(a(g("tip",{text:e.props.tip}),r(e.rect.x+8,e.rect.y-30)),2)]:[]),y=s("fsx-root").props().render(()=>{}).semantics(()=>({role:"group",label:"mixer"})),w=e=>y("root",{},[m("col",{gap:18,pad:48},[i("title",{text:"Tab / Shift-Tab cycle focus · Enter or Space presses · Escape releases",size:15,weight:600,bright:!0}),i("hint",{text:"Hover or focus a middle card: its tooltip (tier 2) paints above the neighbors' badges (tier 0).",size:12}),h("cards",{gap:14},[o("vol-down",{label:"volume −",value:`${e.volume}`,tip:"Enter: lower volume",to:{kind:"vol",delta:-1},role:"button"}),o("vol-up",{label:"volume +",value:`${e.volume}`,tip:"Enter: raise volume",to:{kind:"vol",delta:1},role:"button"}),o("mute",{label:"mute",value:e.muted?"ON":"off",tip:"Enter: toggle mute",to:{kind:"mute"},role:"switch"}),o("ping",{label:"pressed",value:`${e.presses}×`,tip:"Enter: just counts",to:{kind:"ping"},role:"button"})])])]),$=document.getElementById("c"),E=d($,{init:{volume:5,muted:!1,presses:0},update:x,view:w}),M=document.getElementById("sem"),l=(e,t)=>e.map(n=>`${"  ".repeat(t)}<b>${n.role??"?"}</b> ${n.label??""}`+(n.value!==void 0?` = ${n.value}`:"")+`  <span style="opacity:.55">(${Math.round(n.rect.x)},${Math.round(n.rect.y)} ${Math.round(n.rect.w)}×${Math.round(n.rect.h)})</span>
`+l(n.children,t+1)).join(""),c=()=>{M.innerHTML=`rt.semanticsTree()

${l(E.semanticsTree(),0)}`};c();setInterval(c,250);v([{name:"main.ts",code:b}]);

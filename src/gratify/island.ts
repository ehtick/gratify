// ============================================================================
// Gratify islands — DOM elements glued to world-space rects (guide §5e). The
// one place the canvas surrenders to the browser is text: caret, selection,
// IME, clipboard. An island is a real DOM element the runtime keeps registered
// with the world through pan/zoom via a CSS transform.
//
// A part declares the facet:   .island((node) => ({ el, rect }))
// The runtime owns the rest: a positioned layer above the canvas, a per-frame
// translate+scale sync (transform-origin top-left), show/hide with the facet,
// detach on unmount. `el` is created ONCE by the app and its identity is
// stable across frames; the facet just reports where it belongs this frame.
//
// The element is laid out at its WORLD size and scaled by the transform, so
// text wraps and carets land identically at every zoom level.
// ============================================================================

import { Rect, Vec } from "./core";

/** What an island facet returns: the (stable) DOM element and the world-space
 *  rect it occupies at zoom 1. Return null instead to hide the island. */
export interface IslandSpec {
  el: HTMLElement;
  rect: Rect;
}

/** The slice of the runtime viewport the transform depends on. */
export interface IslandView { pan: Vec; zoom: number }

/** The pure kernel: world rect + camera → the CSS that pins an absolutely-
 *  positioned, top-left-origin element over that rect on screen. */
export function islandCss(rect: Rect, view: IslandView): { width: string; height: string; transform: string } {
  return {
    width: `${rect.w}px`,
    height: `${rect.h}px`,
    transform: `translate(${rect.x * view.zoom + view.pan.x}px, ${rect.y * view.zoom + view.pan.y}px) scale(${view.zoom})`,
  };
}

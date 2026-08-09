// ============================================================================
// Gratify semantics — the accessibility slot (layering guide §3.11). A canvas
// is invisible to screen readers; the fix starts with DATA, not DOM. A part
// may declare a `semantics` facet returning { role, label, value }; the
// runtime collects every declared node into a queryable tree
// (Runtime.semanticsTree()) with instance keys, full key paths, and rects.
//
// Deliberately NOT here yet: DOM mirroring, ARIA attributes, live regions.
// This module keeps the slot open so a future layer can build those from the
// tree without retrofitting every part.
// ============================================================================

import type { Rect } from "./core";

/** What a part's `semantics` facet returns. All fields optional — declare
 *  what the part honestly knows. Return null to omit the node this frame. */
export interface SemanticsInfo {
  /** What kind of thing this is ("button", "slider", "group", …). Free-form
   *  today; an ARIA layer would map/validate later. */
  role?: string;
  /** Human-readable name ("OK", "Volume"). */
  label?: string;
  /** Current value, for value-bearing widgets. */
  value?: string | number | boolean;
}

/** One node of the collected tree. Parts WITHOUT a semantics facet are
 *  transparent: their semantic descendants surface to the nearest semantic
 *  ancestor (or the top level), so layout wrappers don't pollute the tree. */
export interface SemanticsNode extends SemanticsInfo {
  /** The instance's own key. */
  key: string;
  /** Full key path from the root ("root/card/ok") — a stable address. */
  path: string;
  /** The instance's current animated rect, in its layer's coordinates
   *  (world coords for world-layer parts). */
  rect: Rect;
  children: SemanticsNode[];
}

// Kernel-level tests for the pure dual-thumb range math
// (examples/shared/range-math.ts): value↔px round trips, quantization,
// cross-clamping, zone picking, and window shifting.

import { describe, expect, it } from "vitest";
import {
  dragMax, dragMin, fracOfValue, pxOfValue, quantize, shiftWindow, valueOfFrac,
  valueOfPx, zoneAt, type RangeDomain,
} from "../examples/shared/range-math";

const d = (lo: number, hi: number, step?: number): RangeDomain => ({ lo, hi, step });

describe("range-math: value ↔ frac ↔ px", () => {
  it("round-trips value → px → value (continuous)", () => {
    const dom = d(-10, 30);
    for (const value of [-10, -3.5, 0, 12.25, 30]) {
      const px = pxOfValue(value, dom, 100, 400);
      expect(valueOfPx(px, dom, 100, 400)).toBeCloseTo(value, 10);
    }
  });

  it("round-trips on a step grid (snap absorbs sub-step px noise)", () => {
    const dom = d(0, 100, 5);
    const px = pxOfValue(35, dom, 0, 200);
    expect(valueOfPx(px + 3, dom, 0, 200)).toBe(35);   // 3px = 1.5 units < step/2
    expect(valueOfPx(px + 6, dom, 0, 200)).toBe(40);   // 6px = 3 units > step/2
  });

  it("clamps px outside the track to the domain ends", () => {
    const dom = d(0, 1);
    expect(valueOfPx(-50, dom, 0, 200)).toBe(0);
    expect(valueOfPx(900, dom, 0, 200)).toBe(1);
  });

  it("is safe on degenerate domains and zero-width tracks", () => {
    expect(fracOfValue(5, d(5, 5))).toBe(0);
    expect(valueOfPx(123, d(0, 10), 50, 0)).toBe(0);
    expect(valueOfFrac(0.5, d(2, 2))).toBe(2);
  });
});

describe("range-math: quantize", () => {
  it("snaps to lo + k*step and clamps", () => {
    const dom = d(1, 10, 2);                 // grid: 1, 3, 5, 7, 9
    expect(quantize(3.9, dom)).toBe(3);
    expect(quantize(4.1, dom)).toBe(5);
    expect(quantize(-4, dom)).toBe(1);
    expect(quantize(40, dom)).toBe(10);      // clamp wins over the grid at hi (input[max] semantics)
  });

  it("no step → clamp only", () => {
    expect(quantize(0.123, d(0, 1))).toBe(0.123);
    expect(quantize(7, d(0, 1))).toBe(1);
  });
});

describe("range-math: cross-clamp", () => {
  it("dragMin can't cross max", () => {
    expect(dragMin(80, 60, d(0, 100))).toEqual({ min: 60, max: 60 });
    expect(dragMin(10, 60, d(0, 100))).toEqual({ min: 10, max: 60 });
  });

  it("dragMax can't cross min", () => {
    expect(dragMax(40, 10, d(0, 100))).toEqual({ min: 40, max: 40 });
    expect(dragMax(40, 90, d(0, 100))).toEqual({ min: 40, max: 90 });
  });

  it("drags quantize before the cross check", () => {
    expect(dragMin(58.7, 60, d(0, 100, 5))).toEqual({ min: 60, max: 60 });
    expect(dragMax(40, 41.2, d(0, 100, 5))).toEqual({ min: 40, max: 40 });
  });
});

describe("range-math: zoneAt", () => {
  const grab = 0.05;
  it("outside the span grabs the nearer thumb", () => {
    expect(zoneAt(0.1, 0.3, 0.7, grab)).toBe("min");
    expect(zoneAt(0.9, 0.3, 0.7, grab)).toBe("max");
  });
  it("near an inner edge grabs that thumb", () => {
    expect(zoneAt(0.33, 0.3, 0.7, grab)).toBe("min");
    expect(zoneAt(0.67, 0.3, 0.7, grab)).toBe("max");
  });
  it("the middle grabs the window", () => {
    expect(zoneAt(0.5, 0.3, 0.7, grab)).toBe("window");
  });
  it("a tight span never yields window", () => {
    expect(zoneAt(0.505, 0.5, 0.52, grab)).toBe("min");
    expect(zoneAt(0.517, 0.5, 0.52, grab)).toBe("max");
  });
});

describe("range-math: shiftWindow", () => {
  it("shifts both ends, width preserved", () => {
    expect(shiftWindow(20, 50, 10, d(0, 100))).toEqual({ min: 30, max: 60 });
    expect(shiftWindow(20, 50, -15, d(0, 100))).toEqual({ min: 5, max: 35 });
  });

  it("clamps at the domain edges without squashing the width", () => {
    expect(shiftWindow(20, 50, 500, d(0, 100))).toEqual({ min: 70, max: 100 });
    expect(shiftWindow(20, 50, -500, d(0, 100))).toEqual({ min: 0, max: 30 });
  });

  it("snaps min to the step grid, width still exact", () => {
    const out = shiftWindow(20, 50, 7.3, d(0, 100, 5));
    expect(out.min).toBe(25);
    expect(out.max - out.min).toBe(30);
  });

  it("width exact even when the grid disagrees at the hi edge", () => {
    const out = shiftWindow(0, 33, 500, d(0, 100, 10));
    expect(out.max).toBe(100);
    expect(out.max - out.min).toBe(33);
  });
});

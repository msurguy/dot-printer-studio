export type EasingName =
  | "linear"
  | "easeIn"
  | "easeOut"
  | "easeInOut"
  | "cubic"
  | "backIn"
  | "backOut"
  | "backInOut";

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export const EASING_LABELS: Record<EasingName, string> = {
  linear: "Linear",
  easeIn: "Ease In",
  easeOut: "Ease Out",
  easeInOut: "Ease In Out",
  cubic: "Cubic",
  backIn: "Back In",
  backOut: "Back Out",
  backInOut: "Back In Out",
};

export const easingFunctions: Record<EasingName, (t: number) => number> = {
  linear: (t) => clamp(t),
  easeIn: (t) => clamp(t * t),
  easeOut: (t) => clamp(1 - Math.pow(1 - t, 2)),
  easeInOut: (t) => {
    const clamped = clamp(t);
    return clamped < 0.5
      ? 2 * clamped * clamped
      : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
  },
  cubic: (t) => clamp(t * t * t),
  backIn: (t) => {
    const s = 1.70158;
    const clamped = clamp(t);
    return clamped * clamped * ((s + 1) * clamped - s);
  },
  backOut: (t) => {
    const s = 1.70158;
    const clamped = clamp(t) - 1;
    return clamp(1 + clamped * clamped * ((s + 1) * clamped + s));
  },
  backInOut: (t) => {
    const s = 1.70158 * 1.525;
    const clamped = clamp(t) * 2;
    if (clamped < 1) {
      return clamp(0.5 * (clamped * clamped * ((s + 1) * clamped - s)));
    }
    const shifted = clamped - 2;
    return clamp(0.5 * (shifted * shifted * ((s + 1) * shifted + s) + 2));
  },
};

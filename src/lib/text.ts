import { FONT_5X7, FONT_HEIGHT, FONT_SPACING, FONT_WIDTH } from "./font5x7";

export type DotSeed = {
  x: number;
  y: number;
};

export const buildTextDots = (text: string, startX: number, startY: number) => {
  const seeds: DotSeed[] = [];
  const upper = text.toUpperCase();

  for (let index = 0; index < upper.length; index += 1) {
    const char = upper[index];
    const glyph = FONT_5X7[char] ?? FONT_5X7[" "];
    const xOffset = startX + index * (FONT_WIDTH + FONT_SPACING);

    for (let row = 0; row < FONT_HEIGHT; row += 1) {
      const line = glyph[row] ?? "00000";
      for (let col = 0; col < FONT_WIDTH; col += 1) {
        if (line[col] === "1") {
          seeds.push({
            x: xOffset + col,
            y: startY + row,
          });
        }
      }
    }
  }

  return seeds;
};

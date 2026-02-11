#!/usr/bin/env npx ts-node

/**
 * Generate Genuary Animation
 *
 * Run with: npx ts-node scripts/generate-genuary.ts
 * Or: npx tsx scripts/generate-genuary.ts
 *
 * Outputs the animation JSON to stdout or a file.
 */

import { generateGenuaryAnimation, exportAnimationToJSON } from "../src/lib/generators/genuaryAnimation";
import * as fs from "fs";
import * as path from "path";

// Parse command line args
const args = process.argv.slice(2);
const seedArg = args.find((arg) => arg.startsWith("--seed="));
const outputArg = args.find((arg) => arg.startsWith("--output="));

const seed = seedArg ? parseInt(seedArg.split("=")[1], 10) : 42;
const outputPath = outputArg ? outputArg.split("=")[1] : null;

console.log(`Generating Genuary animation with seed: ${seed}`);

const animation = generateGenuaryAnimation(seed);
const json = exportAnimationToJSON(animation);

// Statistics
const totalDots = animation.frames.reduce((sum, f) => sum + f.dots.length, 0);
const totalConnections = animation.frames.reduce(
  (sum, f) => sum + f.connections.length,
  0
);

console.log(`\nGenerated animation:`);
console.log(`  Frames: ${animation.frames.length}`);
console.log(`  Total dots: ${totalDots}`);
console.log(`  Total connections: ${totalConnections}`);
console.log(`  Grid size: ${animation.metadata.gridSize}x${animation.metadata.gridSize}`);

if (outputPath) {
  const fullPath = path.resolve(outputPath);
  fs.writeFileSync(fullPath, json, "utf-8");
  console.log(`\nSaved to: ${fullPath}`);
} else {
  console.log(`\n--- Animation JSON ---\n`);
  console.log(json);
}

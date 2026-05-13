#!/usr/bin/env node
/**
 * Reads design-system color tokens and checks WCAG 2.1 AA contrast for
 * foreground/background pairs across light, dark, and ops-dark themes.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const COLORS_CSS_PATH = resolve(__dirname, "../src/styles/tokens/colors.css");

function parseHex(hex) {
  let normalized = hex.replace(/^#/, "");
  if (normalized.length === 3) {
    normalized = normalized.split("").map((part) => part + part).join("");
  }
  if (normalized.length === 8) {
    normalized = normalized.slice(0, 6);
  }
  const value = Number.parseInt(normalized, 16);
  return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff };
}

function parseRgb(value) {
  const match = value.match(/rgba?\(\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)/);
  if (!match) return null;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}

function parseHsl(value) {
  const match = value.match(/hsla?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%/);
  if (!match) return null;

  const h = Number(match[1]) / 360;
  const s = Number(match[2]) / 100;
  const l = Number(match[3]) / 100;

  if (s === 0) {
    const channel = Math.round(l * 255);
    return { r: channel, g: channel, b: channel };
  }

  const hueToRgb = (p, q, t) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, h) * 255),
    b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
  };
}

function parseColor(value) {
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("#")) return parseHex(normalized);
  if (normalized.startsWith("rgb")) return parseRgb(normalized);
  if (normalized.startsWith("hsl")) return parseHsl(normalized);
  return null;
}

function parseTokensFromBlock(block) {
  const tokens = new Map();
  const propRegex = /(--dh-color-[a-z0-9-]+)\s*:\s*([^;]+);/g;
  let propMatch;
  while ((propMatch = propRegex.exec(block)) !== null) {
    tokens.set(propMatch[1], propMatch[2].trim());
  }
  return tokens;
}

function mergeTokens(target, source) {
  for (const [key, value] of source) {
    target.set(key, value);
  }
  return target;
}

function parseAllThemes(cssText) {
  const themes = {
    light: new Map(),
    dark: new Map(),
    "ops-dark": new Map(),
  };

  const rootRegex = /:root\s*\{([^}]*)\}/gs;
  let rootMatch;
  while ((rootMatch = rootRegex.exec(cssText)) !== null) {
    const prefix = cssText.slice(Math.max(0, rootMatch.index - 20), rootMatch.index + 20);
    if (!prefix.includes("[data-theme")) {
      mergeTokens(themes.light, parseTokensFromBlock(rootMatch[1]));
    }
  }

  const darkRegex = /:root\[data-theme=["']?dark["']?\]\s*\{([^}]*)\}/gs;
  let darkMatch;
  while ((darkMatch = darkRegex.exec(cssText)) !== null) {
    mergeTokens(themes.dark, parseTokensFromBlock(darkMatch[1]));
  }

  const opsRegex = /\[data-theme-scope=["']?ops-dark["']?\]\s*\{([^}]*)\}/gs;
  let opsMatch;
  while ((opsMatch = opsRegex.exec(cssText)) !== null) {
    mergeTokens(themes["ops-dark"], parseTokensFromBlock(opsMatch[1]));
  }

  return themes;
}

function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(colorA, colorB) {
  const luminanceA = relativeLuminance(colorA);
  const luminanceB = relativeLuminance(colorB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

function buildPairs(tokens) {
  const pairs = [];
  const bgTokens = [...tokens.keys()].filter((name) => name.startsWith("--dh-color-bg-"));

  for (const fg of ["--dh-color-fg-primary", "--dh-color-fg-secondary"]) {
    if (!tokens.has(fg)) continue;
    for (const bg of bgTokens) {
      pairs.push({ fg, bg, type: "normal" });
    }
  }

  if (tokens.has("--dh-color-fg-muted")) {
    for (const bg of bgTokens.filter((name) => name.includes("canvas") || name.includes("surface"))) {
      pairs.push({ fg: "--dh-color-fg-muted", bg, type: "normal" });
    }
  }

  if (tokens.has("--dh-color-fg-inverse")) {
    for (const bg of ["--dh-color-brand", "--dh-color-accent", "--dh-color-brand-dark"]) {
      if (tokens.has(bg)) {
        pairs.push({ fg: "--dh-color-fg-inverse", bg, type: "normal" });
      }
    }
  }

  if (tokens.has("--dh-color-focus-ring")) {
    for (const bg of bgTokens) {
      pairs.push({ fg: "--dh-color-focus-ring", bg, type: "large" });
    }
  }

  return pairs;
}

function resolveTokenValue(tokenName, tokens, visited = new Set()) {
  if (visited.has(tokenName)) return null;
  visited.add(tokenName);

  const value = tokens.get(tokenName);
  if (!value) return null;

  const varMatch = value.match(/var\(\s*(--[a-z0-9-]+)/);
  if (varMatch) {
    return resolveTokenValue(varMatch[1], tokens, visited);
  }

  return parseColor(value);
}

function formatName(name) {
  return name.replace("--dh-color-", "");
}

function main() {
  let cssText;
  try {
    cssText = readFileSync(COLORS_CSS_PATH, "utf-8");
  } catch (error) {
    console.error(`Cannot read colors.css at: ${COLORS_CSS_PATH}`);
    console.error(error.message);
    process.exit(1);
  }

  const themes = parseAllThemes(cssText);
  const failures = [];
  let totalChecked = 0;

  for (const [themeName, themeTokens] of Object.entries(themes)) {
    if (themeTokens.size === 0) continue;
    const tokens = themeName === "light" ? themeTokens : new Map([...themes.light, ...themeTokens]);

    for (const pair of buildPairs(tokens)) {
      const fgColor = resolveTokenValue(pair.fg, tokens);
      const bgColor = resolveTokenValue(pair.bg, tokens);
      if (!fgColor || !bgColor) continue;

      totalChecked += 1;
      const ratio = contrastRatio(fgColor, bgColor);
      const required = pair.type === "large" ? 3.0 : 4.5;
      if (ratio < required) {
        failures.push({
          theme: themeName,
          fg: pair.fg,
          bg: pair.bg,
          type: pair.type,
          ratio: ratio.toFixed(2),
          required: required.toFixed(1),
        });
      }
    }
  }

  console.log(`\nWCAG Contrast Check - ${COLORS_CSS_PATH}\n`);
  console.log(`Themes checked: ${Object.keys(themes).filter((theme) => themes[theme].size > 0).join(", ")}`);
  console.log(`Total pairs checked: ${totalChecked}`);

  if (failures.length === 0) {
    console.log(`\nAll ${totalChecked} token pairs pass WCAG contrast requirements.\n`);
    process.exit(0);
  }

  console.log(`\n${failures.length} pair(s) fail contrast requirements:\n`);
  console.log("Theme      | Foreground                 | Background                 | Type   | Ratio  | Required");
  console.log("-----------+----------------------------+----------------------------+--------+--------+---------");
  for (const failure of failures) {
    console.log([
      failure.theme.padEnd(10),
      formatName(failure.fg).padEnd(26),
      formatName(failure.bg).padEnd(26),
      failure.type.padEnd(6),
      `${failure.ratio}:1`.padEnd(6),
      `${failure.required}:1`,
    ].join(" | "));
  }
  console.log("\nFix: adjust color tokens in colors.css to meet WCAG 2.1 AA thresholds.");
  console.log("Normal text: >= 4.5:1 | Large text / focus-ring: >= 3.0:1\n");

  process.exit(1);
}

main();

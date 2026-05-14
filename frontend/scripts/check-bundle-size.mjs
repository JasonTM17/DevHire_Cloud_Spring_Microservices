#!/usr/bin/env node
/**
 * CI bundle-size assertion script.
 *
 * Reads the Next.js build output and checks that no route's initial JS
 * (gzipped) exceeds the budget (200KB by default).
 *
 * Usage:
 *   node scripts/check-bundle-size.mjs
 *
 * Exit code 1 if any route exceeds the budget.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BUDGET_BYTES = 200 * 1024; // 200KB gzipped budget
const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(scriptDir, "..");
const NEXT_DIR = existsSync(resolve(process.cwd(), ".next"))
  ? resolve(process.cwd(), ".next")
  : resolve(frontendDir, ".next");

/**
 * Attempt to read route sizes from the build-manifest or app-build-manifest.
 * Next.js stores JS chunks per route in these manifests.
 */
function readBuildManifest() {
  const appBuildManifestPath = join(NEXT_DIR, "app-build-manifest.json");
  const buildManifestPath = join(NEXT_DIR, "build-manifest.json");

  let manifest = null;

  if (existsSync(appBuildManifestPath)) {
    manifest = JSON.parse(readFileSync(appBuildManifestPath, "utf-8"));
  } else if (existsSync(buildManifestPath)) {
    manifest = JSON.parse(readFileSync(buildManifestPath, "utf-8"));
  }

  return manifest;
}

/**
 * Get file size (gzipped estimate: actual file size from .next/static).
 * Next.js outputs gzipped sizes in the build output, but we approximate
 * by reading the actual chunk files from .next/static/chunks.
 */
function getChunkSize(chunkPath) {
  // Chunks are relative paths like "static/chunks/app/page-xxx.js"
  const fullPath = join(NEXT_DIR, chunkPath);
  if (existsSync(fullPath)) {
    return statSync(fullPath).size;
  }
  return 0;
}

/**
 * Recursively find all .js files in a directory.
 */
function findJsFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      findJsFiles(fullPath, files);
    } else if (entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Estimate gzipped size as ~35% of raw size (conservative estimate).
 * In production Next.js builds, gzip typically achieves 60-70% compression.
 */
function estimateGzipSize(rawBytes) {
  return Math.ceil(rawBytes * 0.35);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}

function main() {
  if (!existsSync(NEXT_DIR)) {
    console.error(`[fail] .next directory not found at ${NEXT_DIR}. Run \`next build\` first.`);
    process.exit(1);
  }

  const manifest = readBuildManifest();
  const routeSizes = new Map();

  if (manifest && manifest.pages) {
    // app-build-manifest.json or build-manifest.json has a `pages` key
    const pages = manifest.pages;
    for (const [route, chunks] of Object.entries(pages)) {
      let totalSize = 0;
      for (const chunk of chunks) {
        totalSize += getChunkSize(chunk);
      }
      const gzipEstimate = estimateGzipSize(totalSize);
      routeSizes.set(route, { raw: totalSize, gzip: gzipEstimate, chunks: chunks.length });
    }
  } else {
    // Fallback: scan .next/static/chunks for route-level JS
    const chunksDir = join(NEXT_DIR, "static", "chunks");
    const appDir = join(chunksDir, "app");

    if (existsSync(appDir)) {
      const jsFiles = findJsFiles(appDir);
      // Group by route directory
      for (const file of jsFiles) {
        const relative = file.replace(appDir, "").replace(/\\/g, "/");
        // Extract route from path like /page-xxx.js or /jobs/[id]/page-xxx.js
        const routeParts = relative.split("/").slice(0, -1);
        const route = routeParts.length > 0 ? routeParts.join("/") || "/" : "/";
        const size = statSync(file).size;
        const existing = routeSizes.get(route) || { raw: 0, gzip: 0, chunks: 0 };
        existing.raw += size;
        existing.gzip = estimateGzipSize(existing.raw);
        existing.chunks += 1;
        routeSizes.set(route, existing);
      }
    }

    // Also check pages chunks
    const pagesDir = join(chunksDir, "pages");
    if (existsSync(pagesDir)) {
      const jsFiles = findJsFiles(pagesDir);
      for (const file of jsFiles) {
        const relative = file.replace(pagesDir, "").replace(/\\/g, "/");
        const routeParts = relative.split("/").slice(0, -1);
        const route = routeParts.length > 0 ? `(pages)${routeParts.join("/")}` : "(pages)/";
        const size = statSync(file).size;
        const existing = routeSizes.get(route) || { raw: 0, gzip: 0, chunks: 0 };
        existing.raw += size;
        existing.gzip = estimateGzipSize(existing.raw);
        existing.chunks += 1;
        routeSizes.set(route, existing);
      }
    }
  }

  if (routeSizes.size === 0) {
    console.warn("[warn] No route data found in build output. Skipping bundle size check.");
    process.exit(0);
  }

  // Print table
  console.log("\nBundle Size Report\n");
  console.log("Route                                   Chunks   Gzip (est.)   Status");
  console.log("-----                                   ------   -----------   ------");

  let hasFailure = false;
  const sortedRoutes = [...routeSizes.entries()].sort((a, b) => b[1].gzip - a[1].gzip);

  for (const [route, info] of sortedRoutes) {
    const status = info.gzip > BUDGET_BYTES ? "OVER" : "OK";
    if (info.gzip > BUDGET_BYTES) hasFailure = true;

    const routeCol = route.padEnd(39).slice(0, 39);
    const chunksCol = String(info.chunks).padStart(6);
    const sizeCol = formatBytes(info.gzip).padStart(10);

    console.log(`${routeCol}   ${chunksCol}   ${sizeCol}   ${status}`);
  }

  console.log(`\n  Budget: ${formatBytes(BUDGET_BYTES)} (gzipped) per route`);
  console.log(`  Routes checked: ${routeSizes.size}\n`);

  if (hasFailure) {
    console.error("[fail] Bundle size budget exceeded. One or more routes are over the 200KB limit.");
    process.exit(1);
  } else {
    console.log("[pass] All routes are within the bundle size budget.");
    process.exit(0);
  }
}

main();

#!/usr/bin/env node
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { Resvg } from "@resvg/resvg-js";
import pngToIco from "png-to-ico";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCE_SVG = path.join(ROOT, "logo", "中转.svg");
const OUT_DIR = path.join(ROOT, "build");
const ICONS_DIR = path.join(OUT_DIR, "icons");

const SIZES = [16, 24, 32, 48, 64, 128, 256, 512, 1024];

async function rasterize(svgBuffer, size) {
  const resvg = new Resvg(svgBuffer, {
    fitTo: { mode: "width", value: size },
    background: "rgba(0,0,0,0)",
    font: { loadSystemFonts: false }
  });
  return resvg.render().asPng();
}

async function buildPngs(svgBuffer) {
  await fs.mkdir(ICONS_DIR, { recursive: true });
  const written = {};
  for (const size of SIZES) {
    const png = await rasterize(svgBuffer, size);
    const file = path.join(ICONS_DIR, `${size}x${size}.png`);
    await fs.writeFile(file, png);
    written[size] = file;
  }
  await fs.copyFile(written[512], path.join(OUT_DIR, "icon.png"));
  await fs.copyFile(written[1024], path.join(OUT_DIR, "icon@1024.png"));
  return written;
}

async function buildIco(pngs) {
  const buffer = await pngToIco([pngs[16], pngs[32], pngs[48], pngs[64], pngs[128], pngs[256]]);
  await fs.writeFile(path.join(OUT_DIR, "icon.ico"), buffer);
}

async function buildIcns(pngs) {
  if (process.platform !== "darwin") {
    console.log("skip .icns (iconutil only on macOS)");
    return;
  }
  const iconset = path.join(OUT_DIR, "icon.iconset");
  await fs.rm(iconset, { recursive: true, force: true });
  await fs.mkdir(iconset, { recursive: true });
  const layout = [
    [16, "icon_16x16.png"],
    [32, "icon_16x16@2x.png"],
    [32, "icon_32x32.png"],
    [64, "icon_32x32@2x.png"],
    [128, "icon_128x128.png"],
    [256, "icon_128x128@2x.png"],
    [256, "icon_256x256.png"],
    [512, "icon_256x256@2x.png"],
    [512, "icon_512x512.png"],
    [1024, "icon_512x512@2x.png"]
  ];
  for (const [size, name] of layout) {
    await fs.copyFile(pngs[size], path.join(iconset, name));
  }
  await execFileAsync("iconutil", ["-c", "icns", iconset, "-o", path.join(OUT_DIR, "icon.icns")]);
  await fs.rm(iconset, { recursive: true, force: true });
}

async function copySvg() {
  const target = path.join(ROOT, "public", "logo.svg");
  await fs.copyFile(SOURCE_SVG, target);
}

async function main() {
  const svgBuffer = await fs.readFile(SOURCE_SVG);
  await fs.mkdir(OUT_DIR, { recursive: true });
  const pngs = await buildPngs(svgBuffer);
  await buildIco(pngs);
  await buildIcns(pngs);
  await copySvg();
  console.log("icons written to", path.relative(ROOT, OUT_DIR));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

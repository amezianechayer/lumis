/**
 * Génère l'icône Lumis (icon.png 1024x1024 + splash-icon.png 1024x1024)
 * Usage : node scripts/generate-icon.js
 * Prérequis : npm install canvas --save-dev  (dans apps/mobile)
 */
const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const ASSETS = path.join(__dirname, "../assets");

function drawLumisIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;

  // Background — dark luxury
  ctx.fillStyle = "#0A0A0A";
  ctx.fillRect(0, 0, size, size);

  // Subtle radial gradient
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.55);
  grad.addColorStop(0, "rgba(201,168,76,0.12)");
  grad.addColorStop(1, "rgba(201,168,76,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Outer gold ring
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.42, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(201,168,76,0.35)";
  ctx.lineWidth = size * 0.012;
  ctx.stroke();

  // Inner thin ring
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.37, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(201,168,76,0.15)";
  ctx.lineWidth = size * 0.005;
  ctx.stroke();

  // Gold "L" letter — clean serif style
  const gold = "#C9A84C";
  ctx.fillStyle = gold;
  ctx.strokeStyle = gold;

  const lx = cx - size * 0.09;
  const lTop = cy - size * 0.22;
  const lBot = cy + size * 0.22;
  const lW = size * 0.038;     // stroke width
  const footW = size * 0.20;  // footer width

  // Vertical stroke
  ctx.fillRect(lx, lTop, lW, lBot - lTop);
  // Horizontal foot
  ctx.fillRect(lx, lBot - lW, footW, lW);

  // Small golden dot — luxury accent
  ctx.beginPath();
  ctx.arc(cx + size * 0.12, cy + size * 0.22 - lW / 2, size * 0.025, 0, Math.PI * 2);
  ctx.fillStyle = "#C9A84C";
  ctx.fill();

  return canvas;
}

function drawSplashIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;

  // Transparent background (expo-splash-screen handles bg color)
  ctx.clearRect(0, 0, size, size);

  // Concentric rings
  [0.44, 0.34, 0.24].forEach((r, i) => {
    ctx.beginPath();
    ctx.arc(cx, cy, size * r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(201,168,76,${0.4 - i * 0.12})`;
    ctx.lineWidth = size * 0.008;
    ctx.stroke();
  });

  // L letter
  const lx = cx - size * 0.07;
  const lTop = cy - size * 0.17;
  const lBot = cy + size * 0.17;
  const lW = size * 0.032;
  const footW = size * 0.16;

  ctx.fillStyle = "#C9A84C";
  ctx.fillRect(lx, lTop, lW, lBot - lTop);
  ctx.fillRect(lx, lBot - lW, footW, lW);

  ctx.beginPath();
  ctx.arc(lx + footW + size * 0.018, lBot - lW / 2, size * 0.018, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
}

function save(canvas, filename) {
  const out = fs.createWriteStream(path.join(ASSETS, filename));
  const stream = canvas.createPNGStream();
  stream.pipe(out);
  out.on("finish", () => console.log(`✅ ${filename} généré`));
}

console.log("🎨 Génération des icônes Lumis...");
save(drawLumisIcon(1024), "icon.png");
save(drawLumisIcon(1024), "android-icon-foreground.png");
save(drawSplashIcon(1024), "splash-icon.png");
save(drawLumisIcon(512), "favicon.png");
console.log("📦 Installe canvas si besoin : npm install canvas --save-dev");

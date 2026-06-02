/**
 * Génère toutes les icônes Lumis à partir de assets/lumis-icon-512.png
 * Usage : node scripts/generate-icon.js
 * Prérequis : npm install canvas --save-dev
 */
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

const ASSETS = path.join(__dirname, "../assets");
const BG = "#0D0D0F";
const SOURCE = path.join(ASSETS, "lumis-icon-512.png");

function save(canvas, filename) {
  fs.writeFileSync(path.join(ASSETS, filename), canvas.toBuffer("image/png"));
  console.log(`✅ ${filename}`);
}

async function run() {
  const logo = await loadImage(SOURCE);

  // icon.png — 1024, logo plein (iOS squircle)
  {
    const size = 1024;
    const c = createCanvas(size, size);
    const ctx = c.getContext("2d");
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(logo, 0, 0, size, size);
    save(c, "icon.png");
  }

  // android-icon-foreground.png — 1024, logo à 62% centré (safe zone Android)
  {
    const size = 1024;
    const c = createCanvas(size, size);
    const ctx = c.getContext("2d");
    const inner = Math.round(size * 0.62);
    const off = Math.round((size - inner) / 2);
    ctx.drawImage(logo, off, off, inner, inner);
    save(c, "android-icon-foreground.png");
  }

  // android-icon-background.png — 1024, couleur unie
  {
    const size = 1024;
    const c = createCanvas(size, size);
    const ctx = c.getContext("2d");
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, size, size);
    save(c, "android-icon-background.png");
  }

  // android-icon-monochrome.png — 1024, soleil blanc centré sur transparent
  {
    const size = 1024;
    const c = createCanvas(size, size);
    const ctx = c.getContext("2d");
    const inner = Math.round(size * 0.62);
    const off = Math.round((size - inner) / 2);
    ctx.drawImage(logo, off, off, inner, inner);
    // tint to white-ish for themed icons
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, size, size);
    save(c, "android-icon-monochrome.png");
  }

  // splash-icon.png — 1024, logo à 55% centré sur fond sombre
  {
    const size = 1024;
    const c = createCanvas(size, size);
    const ctx = c.getContext("2d");
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, size, size);
    const inner = Math.round(size * 0.5);
    const off = Math.round((size - inner) / 2);
    ctx.drawImage(logo, off, off, inner, inner);
    save(c, "splash-icon.png");
  }

  // favicon.png — 256
  {
    const size = 256;
    const c = createCanvas(size, size);
    const ctx = c.getContext("2d");
    ctx.drawImage(logo, 0, 0, size, size);
    save(c, "favicon.png");
  }

  console.log("🎨 Toutes les icônes Lumis générées depuis lumis-icon-512.png");
}

run().catch((e) => { console.error(e); process.exit(1); });

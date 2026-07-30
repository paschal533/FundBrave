const sharp = require("sharp");
const path = require("path");

const SRC = "C:/Users/user/Documents/New-folder/FundBrave-/packages/frontend/public/Fundbrave_icon-gradient.png";
const OUT_DIR = path.join(__dirname, "..", "public");

// Brand gradient stops (matches --gradient-brand-fixed in globals.css)
const STOP_A = [255, 138, 92]; // #ff8a5c
const STOP_B = [224, 106, 60]; // #e06a3c

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

async function recolor(width) {
  // Upscale first (alpha-preserving), then recolor pixel-by-pixel using a
  // horizontal gradient across the shape's own bounding box so the two
  // brand colors land exactly where the original purple gradient did.
  const upscaled = await sharp(SRC)
    .resize({ width, height: undefined, fit: "inside", kernel: "lanczos3" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = upscaled;
  const { width: w, height: h, channels } = info;

  let minX = w;
  let maxX = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * channels + 3];
      if (a > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }
  const span = Math.max(1, maxX - minX);

  const out = Buffer.from(data);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * channels;
      const a = data[idx + 3];
      if (a === 0) continue;
      const t = Math.min(1, Math.max(0, (x - minX) / span));
      out[idx] = lerp(STOP_A[0], STOP_B[0], t);
      out[idx + 1] = lerp(STOP_A[1], STOP_B[1], t);
      out[idx + 2] = lerp(STOP_A[2], STOP_B[2], t);
      out[idx + 3] = a;
    }
  }

  return sharp(out, { raw: { width: w, height: h, channels } }).png();
}

async function main() {
  const master = await recolor(1024);
  await master.clone().toFile(path.join(OUT_DIR, "icon-mark.png"));

  const sizes = [16, 32, 48, 180, 192, 512];
  for (const s of sizes) {
    await master
      .clone()
      .resize(s, s, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(path.join(OUT_DIR, `icon-mark-${s}.png`));
  }

  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

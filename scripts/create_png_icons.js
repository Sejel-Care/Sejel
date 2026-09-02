import fs from 'fs';
import zlib from 'zlib';

function createCrcTable() {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCrcTable();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4);
  data.copy(buf, 8);
  const crcData = Buffer.concat([Buffer.from(type), data]);
  buf.writeUInt32BE(crc32(crcData), 8 + len);
  return buf;
}

function distRoundedRect(px, py, rx, ry, rw, rh, rad) {
  const cx = rx + rw / 2;
  const cy = ry + rh / 2;
  const dx = Math.abs(px - cx) - (rw / 2 - rad);
  const dy = Math.abs(py - cy) - (rh / 2 - rad);
  const dax = Math.max(dx, 0);
  const day = Math.max(dy, 0);
  const outsideDist = Math.sqrt(dax * dax + day * day);
  const insideDist = Math.min(Math.max(dx, dy), 0);
  return outsideDist + insideDist - rad;
}

function distToSegment(x0, y0, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(x0 - x1, y0 - y1);
  let tt = ((x0 - x1) * (x2 - x1) + (y0 - y1) * (y2 - y1)) / l2;
  tt = Math.max(0, Math.min(1, tt));
  return Math.hypot(x0 - (x1 + tt * (x2 - x1)), y0 - (y1 + tt * (y2 - y1)));
}

// Distance to Heart Shape
function distToHeart(px, py) {
  // Center at (256, 260)
  // Two upper lobes
  const c1x = 200, c1y = 205, r1 = 60;
  const c2x = 312, c2y = 205, r2 = 60;
  const tipX = 256, tipY = 385;

  // Circle 1 distance
  const dC1 = Math.hypot(px - c1x, py - c1y) - r1;
  // Circle 2 distance
  const dC2 = Math.hypot(px - c2x, py - c2y) - r2;

  // Tangent points from tip to circles
  // Left side line
  const dLineL = distToSegment(px, py, tipX, tipY, c1x - r1 * 0.95, c1y + r1 * 0.3);
  // Right side line
  const dLineR = distToSegment(px, py, tipX, tipY, c2x + r2 * 0.95, c2y + r2 * 0.3);

  // Check if inside the triangular body
  // Signed distance estimation
  // Invert sign if inside triangle formed by (140, 220), (372, 220), (256, 385)
  let insideTriangle = false;
  if (py >= 205 && py <= tipY) {
    const progress = (py - 205) / (tipY - 205);
    const minX = 143 + (tipX - 143) * progress;
    const maxX = 369 - (369 - tipX) * progress;
    if (px >= minX && px <= maxX) {
      insideTriangle = true;
    }
  }

  const minCircle = Math.min(dC1, dC2);
  if (minCircle <= 0 || insideTriangle) {
    // Inside heart
    const edgeDist = Math.min(
      Math.abs(dC1),
      Math.abs(dC2),
      dLineL,
      dLineR
    );
    return -edgeDist;
  }

  // Outside heart
  return Math.min(dC1, dC2, dLineL, dLineR);
}

function generateHeartIcon(size) {
  const width = size;
  const height = size;
  const raw = Buffer.alloc(height * (1 + width * 4));

  const scale = size / 512;

  const ecgPts = [
    [112, 246], [190, 246], [214, 195], [242, 305], [268, 205], [288, 265], [304, 246], [400, 246]
  ];

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    raw[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const px = x / scale;
      const py = y / scale;
      const pixelOffset = rowOffset + 1 + x * 4;

      let r = 0, g = 0, b = 0, a = 0;

      // 1. Background Tile Box with safe margin
      const dTile = distRoundedRect(px, py, 40, 40, 432, 432, 96);

      if (dTile <= 1.0) {
        const tileAlpha = Math.min(1.0, Math.max(0.0, 0.5 - dTile));
        
        // Background Gradient: #1A73E8 (26, 115, 232) -> #0D47A1 (13, 71, 161)
        const t = (px + py) / 1024;
        let bgR = Math.round(26 * (1 - t) + 13 * t);
        let bgG = Math.round(115 * (1 - t) + 71 * t);
        let bgB = Math.round(232 * (1 - t) + 161 * t);

        // 2. Heart Shape
        const dHeart = distToHeart(px, py);
        let heartAlpha = 0;
        if (dHeart <= 1.0) {
          heartAlpha = Math.min(1.0, Math.max(0.0, 0.5 - dHeart));
        }

        // Heart Gradient: #FF3B30 (255, 59, 48) -> #B31217 (179, 18, 23)
        const ht = (py - 145) / 240;
        const heartR = Math.round(255 * (1 - ht) + 179 * ht);
        const heartG = Math.round(59 * (1 - ht) + 18 * ht);
        const heartB = Math.round(48 * (1 - ht) + 23 * ht);

        // 3. ECG Pulse Line
        let minEcgDist = 999;
        for (let i = 0; i < ecgPts.length - 1; i++) {
          const d = distToSegment(px, py, ecgPts[i][0], ecgPts[i][1], ecgPts[i+1][0], ecgPts[i+1][1]);
          if (d < minEcgDist) minEcgDist = d;
        }

        let ecgAlpha = 0;
        if (minEcgDist <= 7.0) {
          ecgAlpha = Math.min(1.0, Math.max(0.0, 0.5 - (minEcgDist - 7.0)));
        }

        // 4. Pulse Dot at (268, 205)
        const dDot = Math.hypot(px - 268, py - 205) - 7.5;
        let dotAlpha = 0;
        if (dDot <= 1.0) {
          dotAlpha = Math.min(1.0, Math.max(0.0, 0.5 - dDot));
        }

        // Composite layers
        let cr = bgR, cg = bgG, cb = bgB;
        if (heartAlpha > 0) {
          cr = Math.round(cr * (1 - heartAlpha) + heartR * heartAlpha);
          cg = Math.round(cg * (1 - heartAlpha) + heartG * heartAlpha);
          cb = Math.round(cb * (1 - heartAlpha) + heartB * heartAlpha);
        }

        if (ecgAlpha > 0) {
          cr = Math.round(cr * (1 - ecgAlpha) + 255 * ecgAlpha);
          cg = Math.round(cg * (1 - ecgAlpha) + 255 * ecgAlpha);
          cb = Math.round(cb * (1 - ecgAlpha) + 255 * ecgAlpha);
        }

        if (dotAlpha > 0) {
          cr = Math.round(cr * (1 - dotAlpha) + 255 * dotAlpha);
          cg = Math.round(cg * (1 - dotAlpha) + 255 * dotAlpha);
          cb = Math.round(cb * (1 - dotAlpha) + 255 * dotAlpha);
        }

        r = cr;
        g = cg;
        b = cb;
        a = Math.round(tileAlpha * 255);
      }

      raw[pixelOffset] = r;
      raw[pixelOffset + 1] = g;
      raw[pixelOffset + 2] = b;
      raw[pixelOffset + 3] = a;
    }
  }

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth
  ihdrData[9] = 6; // Color type: RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // IDAT
  const compressed = zlib.deflateSync(raw);
  const idat = makeChunk('IDAT', compressed);

  // IEND
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const icon192 = generateHeartIcon(192);
const icon512 = generateHeartIcon(512);

fs.writeFileSync('public/icons/icon-192.png', icon192);
fs.writeFileSync('public/icons/icon-512.png', icon512);
console.log('Successfully generated Full Heart Logo icons: public/icons/icon-192.png and icon-512.png');

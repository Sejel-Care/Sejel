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

function generateSejelIcon(size) {
  const width = size;
  const height = size;
  const raw = Buffer.alloc(height * (1 + width * 4));

  const scale = size / 512;

  // Helper for drawing distance to rounded rect
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

  // Draw pixels
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    raw[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const px = x / scale;
      const py = y / scale;
      const pixelOffset = rowOffset + 1 + x * 4;

      // Base background: transparent
      let r = 0, g = 0, b = 0, a = 0;

      // Shield Rounded Box with 12% safe padding: x=56, y=56, w=400, h=400, radius=90
      const dShield = distRoundedRect(px, py, 56, 56, 400, 400, 90);

      if (dShield <= 1.0) {
        // Antialiasing for shield
        const shieldAlpha = Math.min(1.0, Math.max(0.0, 0.5 - dShield));
        // Blue Gradient: #1A73E8 (26, 115, 232) -> #1557B0 (21, 87, 176)
        const t = (px + py) / 1024;
        let bgR = Math.round(26 * (1 - t) + 21 * t);
        let bgG = Math.round(115 * (1 - t) + 87 * t);
        let bgB = Math.round(232 * (1 - t) + 176 * t);

        // Cross Bars:
        // Vertical: x=226, y=136, w=60, h=240, r=30
        // Horizontal: x=136, y=226, w=240, h=60, r=30
        const dV = distRoundedRect(px, py, 226, 136, 60, 240, 30);
        const dH = distRoundedRect(px, py, 136, 226, 240, 60, 30);
        const dCross = Math.min(dV, dH);

        let crossAlpha = 0;
        if (dCross <= 1.0) {
          crossAlpha = Math.min(1.0, Math.max(0.0, 0.5 - dCross));
        }

        // ECG Heartbeat Line:
        // Points: (140,256) -> (216,256) -> (234,206) -> (256,308) -> (278,222) -> (296,256) -> (372,256)
        const pts = [
          [140, 256], [216, 256], [234, 206], [256, 308], [278, 222], [296, 256], [372, 256]
        ];
        
        function distToSegment(x0, y0, x1, y1, x2, y2) {
          const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
          if (l2 === 0) return Math.hypot(x0 - x1, y0 - y1);
          let tt = ((x0 - x1) * (x2 - x1) + (y0 - y1) * (y2 - y1)) / l2;
          tt = Math.max(0, Math.min(1, tt));
          return Math.hypot(x0 - (x1 + tt * (x2 - x1)), y0 - (y1 + tt * (y2 - y1)));
        }

        let minLineDist = 999;
        for (let i = 0; i < pts.length - 1; i++) {
          const d = distToSegment(px, py, pts[i][0], pts[i][1], pts[i+1][0], pts[i+1][1]);
          if (d < minLineDist) minLineDist = d;
        }

        // Heart Dot at (256, 186), radius 14
        const dDot = Math.hypot(px - 256, py - 186) - 14;
        let dotAlpha = 0;
        if (dDot <= 1.0) {
          dotAlpha = Math.min(1.0, Math.max(0.0, 0.5 - dDot));
        }

        let ecgAlpha = 0;
        if (minLineDist <= 7) {
          ecgAlpha = Math.min(1.0, Math.max(0.0, (7 - minLineDist)));
        }

        // Composite layers
        let cr = bgR, cg = bgG, cb = bgB;
        if (crossAlpha > 0) {
          cr = Math.round(cr * (1 - crossAlpha) + 255 * crossAlpha);
          cg = Math.round(cg * (1 - crossAlpha) + 255 * crossAlpha);
          cb = Math.round(cb * (1 - crossAlpha) + 255 * crossAlpha);
        }

        if (ecgAlpha > 0) {
          // Blue ECG pulse line #1A73E8
          cr = Math.round(cr * (1 - ecgAlpha) + 26 * ecgAlpha);
          cg = Math.round(cg * (1 - ecgAlpha) + 115 * ecgAlpha);
          cb = Math.round(cb * (1 - ecgAlpha) + 232 * ecgAlpha);
        }

        if (dotAlpha > 0) {
          // Red heart dot #EA4335
          cr = Math.round(cr * (1 - dotAlpha) + 234 * dotAlpha);
          cg = Math.round(cg * (1 - dotAlpha) + 67 * dotAlpha);
          cb = Math.round(cb * (1 - dotAlpha) + 53 * dotAlpha);
        }

        r = cr;
        g = cg;
        b = cb;
        a = Math.round(shieldAlpha * 255);
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

const icon192 = generateSejelIcon(192);
const icon512 = generateSejelIcon(512);

fs.writeFileSync('public/icons/icon-192.png', icon192);
fs.writeFileSync('public/icons/icon-512.png', icon512);
console.log('Successfully generated public/icons/icon-192.png (' + icon192.length + ' bytes) and icon-512.png (' + icon512.length + ' bytes)');

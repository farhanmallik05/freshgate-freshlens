import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimal PNG encoder
function createPng(width, height, r, g, b, a = 255) {
  const bytesPerPixel = 4;
  const rowSize = width * bytesPerPixel;
  const rawData = Buffer.alloc((rowSize + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowSize + 1);
    rawData[rowOffset] = 0; // Filter type: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * bytesPerPixel;
      // Draw a subtle border / glyph shape
      const isBorder = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const isCenter = Math.abs(x - width / 2) < width / 4 && Math.abs(y - height / 2) < height / 4;

      if (isBorder) {
        rawData[pxOffset] = Math.max(0, r - 30);
        rawData[pxOffset + 1] = Math.max(0, g - 30);
        rawData[pxOffset + 2] = Math.max(0, b - 30);
        rawData[pxOffset + 3] = a;
      } else if (isCenter) {
        rawData[pxOffset] = 255;
        rawData[pxOffset + 1] = 255;
        rawData[pxOffset + 2] = 255;
        rawData[pxOffset + 3] = a;
      } else {
        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
        rawData[pxOffset + 3] = a;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression: Deflate
  ihdr[11] = 0; // Filter: Adaptive
  ihdr[12] = 0; // Interlace: None

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, "ascii");
    data.copy(buf, 8);

    // CRC32
    let crc = 0xffffffff;
    for (let i = 4; i < 8 + len; i++) {
      const byte = buf[i];
      crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const ihdrChunk = makeChunk("IHDR", ihdr);
  const idatChunk = makeChunk("IDAT", compressed);
  const iendChunk = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Precompute CRC table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

const iconsDir = path.resolve(__dirname, "../public/icons");
fs.mkdirSync(iconsDir, { recursive: true });

// Primary FreshLens emerald brand color: rgb(16, 185, 129)
const sizes = [16, 32, 48, 128];
for (const size of sizes) {
  const png = createPng(size, size, 16, 185, 129, 255);
  const outPath = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Generated icon: ${outPath} (${size}x${size})`);
}

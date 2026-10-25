import { readFileSync } from "node:fs";
const cache = new Map();
export function imageDimensions(path) {
  if (cache.has(path)) return cache.get(path);
  let result;
  try {
    const b = readFileSync(path);
    if (b.subarray(1, 4).toString() === "PNG")
      result = [b.readUInt32BE(16), b.readUInt32BE(20)];
    else if (b.subarray(0, 3).toString() === "GIF")
      result = [b.readUInt16LE(6), b.readUInt16LE(8)];
    else if (b[0] === 255 && b[1] === 216) {
      let offset = 2;
      while (offset + 8 < b.length) {
        if (b[offset] !== 255) break;
        const marker = b[offset + 1];
        if (
          [
            192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
          ].includes(marker)
        ) {
          result = [b.readUInt16BE(offset + 7), b.readUInt16BE(offset + 5)];
          break;
        }
        const length = b.readUInt16BE(offset + 2);
        if (length < 2) break;
        offset += length + 2;
      }
    } else if (b.subarray(8, 12).toString() === "WEBP") {
      const format = b.subarray(12, 16).toString();
      if (format === "VP8X")
        result = [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
      else if (format === "VP8 ")
        result = [b.readUInt16LE(26) & 16383, b.readUInt16LE(28) & 16383];
      else if (format === "VP8L")
        result = [
          1 + (((b[22] & 63) << 8) | b[21]),
          1 + (((b[24] & 15) << 10) | (b[23] << 2) | (b[22] >> 6)),
        ];
    }
  } catch {
    /* Missing sources retain the explicit unavailable-image state. */
  }
  cache.set(path, result);
  return result;
}

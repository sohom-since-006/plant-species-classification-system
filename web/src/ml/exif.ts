/**
 * Lightweight pure TypeScript EXIF orientation parser and canvas transformer.
 * Works in all browsers and Node.js without any external dependencies.
 */

/**
 * Extracts EXIF orientation (1-8) from JPEG array buffer or byte array.
 * Returns 1 if orientation tag is not present or image is not JPEG.
 */
export function getExifOrientation(buffer: ArrayBuffer | Uint8Array): number {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const len = bytes.length;

  // Must start with JPEG SOI (0xFFD8)
  if (len < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return 1;
  }

  let offset = 2;
  while (offset < len - 1) {
    if (bytes[offset] !== 0xff) {
      break;
    }
    const marker = bytes[offset + 1];
    // Stop at SOS (Start of Scan) or EOI (End of Image)
    if (marker === 0xda || marker === 0xd9) {
      break;
    }

    const markerLen = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
    if (markerLen < 2) break;

    // APP1 marker (0xFFE1)
    if (marker === 0xe1 && offset + 4 + 6 <= len) {
      // Check for 'Exif\0\0'
      if (
        bytes[offset + 4] === 0x45 && // E
        bytes[offset + 5] === 0x78 && // x
        bytes[offset + 6] === 0x69 && // i
        bytes[offset + 7] === 0x66 && // f
        bytes[offset + 8] === 0x00 &&
        bytes[offset + 9] === 0x00
      ) {
        return parseTiffOrientation(bytes, offset + 10, markerLen - 8);
      }
    }

    offset += 2 + markerLen;
  }

  return 1;
}

function parseTiffOrientation(bytes: Uint8Array, tiffStart: number, maxLen: number): number {
  if (tiffStart + 8 > bytes.length || maxLen < 8) return 1;

  // Byte order: II (0x4949) = little endian, MM (0x4D4D) = big endian
  const isLittle = bytes[tiffStart] === 0x49 && bytes[tiffStart + 1] === 0x49;
  const isBig = bytes[tiffStart] === 0x4d && bytes[tiffStart + 1] === 0x4d;
  if (!isLittle && !isBig) return 1;

  const readU16 = (o: number) => {
    if (o + 2 > bytes.length) return 0;
    return isLittle ? bytes[o]! | (bytes[o + 1]! << 8) : (bytes[o]! << 8) | bytes[o + 1]!;
  };

  const readU32 = (o: number) => {
    if (o + 4 > bytes.length) return 0;
    return isLittle
      ? (bytes[o]! | (bytes[o + 1]! << 8) | (bytes[o + 2]! << 16) | (bytes[o + 3]! << 24)) >>> 0
      : ((bytes[o]! << 24) | (bytes[o + 1]! << 16) | (bytes[o + 2]! << 8) | bytes[o + 3]!) >>> 0;
  };

  // Verify 42
  if (readU16(tiffStart + 2) !== 0x002a) return 1;

  const firstIfdOffset = readU32(tiffStart + 4);
  if (firstIfdOffset < 8 || firstIfdOffset >= maxLen) return 1;

  const ifdStart = tiffStart + firstIfdOffset;
  const numEntries = readU16(ifdStart);

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdStart + 2 + i * 12;
    if (entryOffset + 12 > bytes.length) break;

    const tag = readU16(entryOffset);
    // Orientation tag = 0x0112
    if (tag === 0x0112) {
      const orientation = readU16(entryOffset + 8);
      if (orientation >= 1 && orientation <= 8) {
        return orientation;
      }
      return 1;
    }
  }

  return 1;
}

/**
 * Returns canvas dimensions transformed according to EXIF orientation.
 * Orientations 5, 6, 7, 8 swap width and height.
 */
export function getTransformedDimensions(
  width: number,
  height: number,
  orientation: number,
): { width: number; height: number } {
  if (orientation >= 5 && orientation <= 8) {
    return { width: height, height: width };
  }
  return { width, height };
}

/**
 * Applies 2D canvas transformation matrix corresponding to EXIF orientation.
 * After this transform, drawImage(img, 0, 0, width, height) will draw upright.
 */
export function applyOrientationTransform(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  orientation: number,
  width: number,
  height: number,
): void {
  switch (orientation) {
    case 2:
      // Horizontal flip
      ctx.transform(-1, 0, 0, 1, width, 0);
      break;
    case 3:
      // 180 rotate
      ctx.transform(-1, 0, 0, -1, width, height);
      break;
    case 4:
      // Vertical flip
      ctx.transform(1, 0, 0, -1, 0, height);
      break;
    case 5:
      // Vertical flip + 90 rotate CCW
      ctx.transform(0, 1, 1, 0, 0, 0);
      break;
    case 6:
      // 90 rotate CW
      ctx.transform(0, 1, -1, 0, height, 0);
      break;
    case 7:
      // Horizontal flip + 90 rotate CCW
      ctx.transform(0, -1, -1, 0, height, width);
      break;
    case 8:
      // 90 rotate CCW (270 CW)
      ctx.transform(0, -1, 1, 0, 0, width);
      break;
    default:
      // 1: normal
      break;
  }
}

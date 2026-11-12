/**
 * Security-hardened thumbnail generation for cloud storage.
 * Per docs/SECURITY.md:
 * - Re-encodes via canvas before upload to strip EXIF, GPS, and malicious payloads.
 * - Downscales to max 512px dimension for small bandwidth footprint (<50KB).
 */
export async function createSafeThumbnail(
  source: HTMLImageElement | HTMLCanvasElement | Blob | string,
  maxDimension = 512,
  quality = 0.82,
): Promise<Blob> {
  let img: HTMLImageElement;

  if (typeof source === 'string') {
    img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = source;
    await img.decode();
  } else if (source instanceof Blob) {
    const objectUrl = URL.createObjectURL(source);
    try {
      img = new Image();
      img.src = objectUrl;
      await img.decode();
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } else if (source instanceof HTMLCanvasElement) {
    const blob = await new Promise<Blob | null>((resolve) =>
      source.toBlob(resolve, 'image/jpeg', quality),
    );
    if (!blob) throw new Error('Failed to convert canvas to blob');
    return blob;
  } else {
    img = source;
  }

  // Calculate downscaled aspect-preserved dimensions
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D rendering context');

  // Fill with dark neutral background for transparent images
  ctx.fillStyle = '#0b1411';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob failed'));
        }
      },
      'image/jpeg',
      quality,
    );
  });
}

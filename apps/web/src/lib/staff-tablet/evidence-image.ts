import "server-only";
import sharp from "sharp";

export const OPERATIONAL_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
export const OPERATIONAL_EVIDENCE_MAX_PIXELS = 25_000_000;

/** Decode the original bytes; never transform bytes after the tablet hashes them.
 * Callers must bound retrieval and concurrency separately. Sharp/libvips enforces
 * the input pixel cap before raster allocation; warning-level corruption fails.
 */
export async function validateOperationalEvidenceImage(bytes: Buffer, mime: string) {
  try {
    if (bytes.length === 0 || bytes.length > OPERATIONAL_EVIDENCE_MAX_BYTES ||
      !["image/jpeg", "image/png"].includes(mime)) throw new Error();
    const image = sharp(bytes, { failOn: "warning", limitInputPixels: OPERATIONAL_EVIDENCE_MAX_PIXELS, sequentialRead: true });
    const meta = await image.metadata();
    if (meta.format !== mime.slice(6) || !meta.width || !meta.height ||
      meta.width * meta.height > OPERATIONAL_EVIDENCE_MAX_PIXELS || (meta.pages ?? 1) !== 1) throw new Error();
    // Force full raster decoding. metadata() alone accepts truncated image data.
    const decoded = await image.timeout({ seconds: 5 }).raw().toBuffer();
    decoded.fill(0);
    return { width: meta.width, height: meta.height, format: meta.format };
  } catch {
    throw new Error("EVIDENCE_STORAGE_VERIFICATION_FAILED");
  }
}

/** @jest-environment node */
import sharp from "sharp";
import { validateOperationalEvidenceImage } from "./evidence-image";

describe("operational exact-byte image policy", () => {
  test.each(["jpeg", "png"] as const)("decodes real %s without normalizing submitted bytes", async format => {
    const bytes = await sharp({ create: { width: 3, height: 2, channels: 3, background: "red" } }).toFormat(format).toBuffer();
    const before = Buffer.from(bytes);
    await expect(validateOperationalEvidenceImage(bytes, `image/${format}`)).resolves.toEqual({ width: 3, height: 2, format });
    expect(bytes).toEqual(before);
  });
  test("rejects actual format mismatch", async () => {
    const bytes = await sharp({ create: { width: 1, height: 1, channels: 3, background: "red" } }).png().toBuffer();
    await expect(validateOperationalEvidenceImage(bytes, "image/jpeg")).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
  });
  test.each(["image/webp", "image/heic", "image/bmp", "application/pdf"])("rejects %s", async mime => {
    await expect(validateOperationalEvidenceImage(Buffer.from("not image"), mime)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
  });
  test("rejects empty, truncated and over-limit bytes", async () => {
    for (const bytes of [Buffer.alloc(0), Buffer.from("\x89PNG"), Buffer.alloc(10 * 1024 * 1024 + 1)]) {
      await expect(validateOperationalEvidenceImage(bytes, "image/png")).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
    }
  });
  test("rejects more than 25 megapixels before decoding", async () => {
    const bytes = await sharp({ create: { width: 5001, height: 5000, channels: 3, background: "red" } }).png().toBuffer();
    await expect(validateOperationalEvidenceImage(bytes, "image/png")).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
  });
});

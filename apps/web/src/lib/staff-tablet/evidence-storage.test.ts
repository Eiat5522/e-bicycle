/** @jest-environment node */
import { OperationalEvidenceStorage } from "./evidence-storage";

test.each(["http://example.com", "https://user:secret@example.com", "https://example.com/path", "https://example.com?x=1"])("refuses unsafe storage origin %s", origin => {
  expect(() => new OperationalEvidenceStorage({ origin, bucket: "private-evidence", serviceKey: "test" })).toThrow();
});
test("accepts explicit fixed HTTPS origin", () => {
  expect(() => new OperationalEvidenceStorage({ origin: "https://example.com", bucket: "private-evidence", serviceKey: "test" })).not.toThrow();
});

/** @jest-environment node */
import { operationalEvidenceWorkflow } from "./evidence-workflow";

test("absent explicit operational configuration stays fail-closed", () => {
  expect(operationalEvidenceWorkflow({})).toBeUndefined();
});
test("partial and insecure configuration stay fail-closed", () => {
  expect(operationalEvidenceWorkflow({ API08_DATABASE_URL: "postgresql://postgres@localhost/db" })).toBeUndefined();
});

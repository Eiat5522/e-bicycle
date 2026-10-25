import type {
  StaffTabletBootstrapResponse, TabletSyncEnvelope, TabletSyncResponse,
  EvidenceInitRequest, EvidenceInitResponse, EvidenceCompleteRequest,
  EvidenceCompleteResponse, StaffTabletSyncStatusResponse,
  RiderRegistrationPayload,
} from "../src/index";

type RequiredKeys<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? never : K }[keyof T];
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const bootstrapKeys: Equal<RequiredKeys<StaffTabletBootstrapResponse>,
  "serverTime" | "station" | "staff" | "device" | "notice" | "bikes" | "activeRentals" | "pendingPayments" | "openIncidents" | "sync"> = true;
const envelopeKeys: Equal<RequiredKeys<TabletSyncEnvelope>,
  "clientBatchId" | "deviceId" | "stationId" | "staffId" | "createdAtDevice" | "appVersion" | "records"> = true;
const syncKeys: Equal<RequiredKeys<TabletSyncResponse>,
  "serverTime" | "serverRevision" | "accepted" | "conflicts" | "rejected" | "evidenceUploadRequests"> = true;
const initKeys: Equal<keyof EvidenceInitRequest,
  "deviceId" | "stationId" | "parentLocalId" | "evidenceLocalId" | "kind" | "mimeType" | "byteSize" | "sha256"> = true;
const upload: EvidenceInitResponse = { evidenceLocalId: "e", uploadUrl: "https://storage.invalid", uploadMethod: "PUT", headers: {}, expiresAt: "server expiry" };
const complete: EvidenceCompleteRequest = { evidenceLocalId: "e", parentLocalId: "p", sha256: "hash", uploadedAtDevice: "device time" };
const linked: EvidenceCompleteResponse = { evidenceLocalId: "e", serverAttachmentId: "a", linked: false };
const status: StaffTabletSyncStatusResponse = { serverTime: "time", serverRevision: "cursor", stationSnapshotDelta: {}, conflicts: [], resolvedLocalIds: [] };
const consentKeys: Equal<keyof RiderRegistrationPayload["pdpaConsent"], "acceptedAtDevice" | "noticeVersion" | "method" | "staffId" | "stationId"> = true;

test("approved HTTP contracts export literal wire shapes without policy defaults", () => {
  expect([bootstrapKeys, envelopeKeys, syncKeys, initKeys, consentKeys]).toEqual([true, true, true, true, true]);
  expect(JSON.parse(JSON.stringify({ upload, complete, linked, status }))).toEqual({ upload, complete, linked, status });
});

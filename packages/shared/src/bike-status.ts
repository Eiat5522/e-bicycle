export const bikeStatusValues = [
  "ready_to_rent",
  "reserved",
  "in_use",
  "returned_pending_inspection",
  "charging",
  "maintenance_required",
  "out_of_service"
] as const;

export type BikeStatus = (typeof bikeStatusValues)[number];

export const bikeStatusLabels: Record<BikeStatus, string> = {
  ready_to_rent: "Ready to rent",
  reserved: "Reserved",
  in_use: "In use",
  returned_pending_inspection: "Returned / pending inspection",
  charging: "Charging",
  maintenance_required: "Maintenance required",
  out_of_service: "Out of service"
};

export const bikeStatusRentability: Record<BikeStatus, boolean> = {
  ready_to_rent: true,
  reserved: false,
  in_use: false,
  returned_pending_inspection: false,
  charging: false,
  maintenance_required: false,
  out_of_service: false
};

export const bikeStatusOperationalBlocking: Record<BikeStatus, boolean> = {
  ready_to_rent: false,
  reserved: true,
  in_use: false,
  returned_pending_inspection: true,
  charging: true,
  maintenance_required: true,
  out_of_service: true
};

export const bikeStatusSafetyBlocking: Record<BikeStatus, boolean> = {
  ready_to_rent: false,
  reserved: false,
  in_use: false,
  returned_pending_inspection: true,
  charging: false,
  maintenance_required: true,
  out_of_service: true
};

export const bikeStatusBadgeTone: Record<BikeStatus, "success" | "info" | "warning" | "danger" | "muted"> = {
  ready_to_rent: "success",
  reserved: "warning",
  in_use: "info",
  returned_pending_inspection: "warning",
  charging: "info",
  maintenance_required: "danger",
  out_of_service: "muted"
};

export type BikeStatusActor = "rider" | "staff" | "technician" | "manager" | "sync";

export type BikeStatusAction =
  | "reserve"
  | "start_ride"
  | "complete_ride"
  | "inspect_and_release"
  | "start_charging"
  | "finish_charging"
  | "request_maintenance"
  | "resolve_maintenance"
  | "mark_out_of_service"
  | "return_to_service"
  | "reconcile";

export interface BikeStatusTransitionRule {
  readonly actor: BikeStatusActor;
  readonly action: BikeStatusAction;
  readonly from: readonly BikeStatus[];
  readonly to: BikeStatus;
  readonly transitionKind: string;
}

export const bikeStatusTransitionRules = [
  {
    actor: "rider",
    action: "reserve",
    from: ["ready_to_rent"],
    to: "reserved",
    transitionKind: "reserve"
  },
  {
    actor: "rider",
    action: "start_ride",
    from: ["ready_to_rent", "reserved"],
    to: "in_use",
    transitionKind: "ride_start"
  },
  {
    actor: "rider",
    action: "complete_ride",
    from: ["in_use"],
    to: "returned_pending_inspection",
    transitionKind: "ride_end"
  },
  {
    actor: "staff",
    action: "inspect_and_release",
    from: ["returned_pending_inspection"],
    to: "ready_to_rent",
    transitionKind: "inspection_clear"
  },
  {
    actor: "staff",
    action: "start_charging",
    from: ["returned_pending_inspection", "ready_to_rent"],
    to: "charging",
    transitionKind: "charging_start"
  },
  {
    actor: "technician",
    action: "finish_charging",
    from: ["charging"],
    to: "ready_to_rent",
    transitionKind: "charging_complete"
  },
  {
    actor: "staff",
    action: "request_maintenance",
    from: ["returned_pending_inspection", "ready_to_rent", "charging"],
    to: "maintenance_required",
    transitionKind: "maintenance_start"
  },
  {
    actor: "technician",
    action: "resolve_maintenance",
    from: ["maintenance_required"],
    to: "ready_to_rent",
    transitionKind: "maintenance_complete"
  },
  {
    actor: "manager",
    action: "mark_out_of_service",
    from: [
      "ready_to_rent",
      "reserved",
      "returned_pending_inspection",
      "charging",
      "maintenance_required"
    ],
    to: "out_of_service",
    transitionKind: "out_of_service"
  },
  {
    actor: "manager",
    action: "return_to_service",
    from: ["out_of_service", "maintenance_required"],
    to: "ready_to_rent",
    transitionKind: "return_to_service"
  },
  {
    actor: "sync",
    action: "reconcile",
    from: bikeStatusValues,
    to: "ready_to_rent",
    transitionKind: "sync_reconcile"
  }
] as const satisfies readonly BikeStatusTransitionRule[];

export function isBikeRentableStatus(status: BikeStatus) {
  return bikeStatusRentability[status];
}

export function isBikeStatusSafetyBlocked(status: BikeStatus) {
  return bikeStatusSafetyBlocking[status];
}

export function isBikeStatusOperationallyBlocked(status: BikeStatus) {
  return bikeStatusOperationalBlocking[status];
}

export function getBikeStatusLabel(status: BikeStatus) {
  return bikeStatusLabels[status];
}

export function getBikeStatusTransitionRule(actor: BikeStatusActor, action: BikeStatusAction) {
  return bikeStatusTransitionRules.find(
    (rule) => rule.actor === actor && rule.action === action
  );
}

export function canTransitionBikeStatus(
  actor: BikeStatusActor,
  action: BikeStatusAction,
  from: BikeStatus,
  to: BikeStatus
) {
  const rule = getBikeStatusTransitionRule(actor, action);

  if (!rule) {
    return false;
  }

  return rule.to === to && (rule.from as readonly BikeStatus[]).includes(from);
}

export function getBikeStatusTransitionKind(actor: BikeStatusActor, action: BikeStatusAction) {
  const rule = getBikeStatusTransitionRule(actor, action);
  return rule?.transitionKind;
}

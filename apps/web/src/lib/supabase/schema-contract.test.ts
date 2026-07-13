import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];

describe("database schema contract", () => {
  it("exposes the MVP operational tables and fleet fields", () => {
    const station: Tables["stations"]["Insert"] = {
      station_name: "Lamphun Tourism Center",
      station_type: "hub"
    };
    const staffProfile: Tables["staff_profiles"]["Insert"] = {
      profile_id: "11111111-1111-1111-1111-111111111111",
      staff_name: "Station Admin",
      role: "station_admin"
    };
    const battery: Tables["batteries"]["Insert"] = {
      battery_code: "BAT-001",
      status: "available"
    };
    const payment: Tables["payments"]["Insert"] = {
      amount: 120,
      payment_method: "promptpay",
      payment_status: "pending"
    };
    const attachment: Tables["attachments"]["Insert"] = {
      entity_table: "bikes",
      entity_id: "G-104",
      attachment_type: "photo_evidence",
      file_url: "https://storage.example/bike-photo.jpg"
    };
    const maintenanceLog: Tables["maintenance_logs"]["Insert"] = {
      bike_id: "G-104",
      repair_type: "pm",
      date_reported: "2026-07-10T00:00:00.000Z"
    };
    const asset: Tables["asset_inventory"]["Insert"] = {
      item_description: "Brake pad",
      quantity: 10
    };
    const incident: Tables["incidents"]["Insert"] = {
      incident_type: "damage",
      status: "open"
    };
    const auditLog: Tables["audit_logs"]["Insert"] = {
      action_performed: "bike.updated",
      entity_table: "bikes",
      entity_id: "G-104"
    };
    const bike: Tables["bikes"]["Update"] = {
      qr_code: "G-104",
      serial_number: "SN-104",
      station_id: "33333333-3333-3333-3333-333333333333",
      battery_status: "available",
      device_status: "online"
    };
    const rental: Tables["rental_transactions"]["Update"] = {
      rental_status: "completed",
      source_system: "app",
      reconciled_at: "2026-07-10T00:00:00.000Z"
    };

    expect(station.station_type).toBe("hub");
    expect(staffProfile.role).toBe("station_admin");
    expect(battery.status).toBe("available");
    expect(payment.payment_method).toBe("promptpay");
    expect(attachment.entity_id).toBe("G-104");
    expect(maintenanceLog.repair_type).toBe("pm");
    expect(asset.quantity).toBe(10);
    expect(incident.incident_type).toBe("damage");
    expect(auditLog.entity_id).toBe("G-104");
    expect(bike.qr_code).toBe("G-104");
    expect(rental.rental_status).toBe("completed");
  });
});

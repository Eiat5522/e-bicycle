import type { Database } from "./supabase.types";

type Tables = Database["public"]["Tables"];

describe("database schema contract", () => {
  it("exposes the MVP operational tables and compatibility fields", () => {
    const station: Tables["stations"]["Insert"] = {
      station_name: "Lamphun Tourism Center",
      station_type: "hub"
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
    const bike: Tables["bikes"]["Update"] = {
      qr_code: "G-104",
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
    expect(battery.status).toBe("available");
    expect(payment.payment_method).toBe("promptpay");
    expect(attachment.entity_id).toBe("G-104");
    expect(bike.qr_code).toBe("G-104");
    expect(rental.rental_status).toBe("completed");
  });
});

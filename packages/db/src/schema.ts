import {
  doublePrecision,
  foreignKey,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

export const bikeStatus = pgEnum("bike_status", ["available", "reserved", "in_use", "maintenance"]);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().notNull(),
    email: text("email").notNull(),
    firstName: text("first_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    foreignKey({
      columns: [table.id],
      foreignColumns: [authUsers.id],
      name: "profiles_id_auth_users_id_fk"
    }).onDelete("cascade")
  ]
);

export const bikes = pgTable("bikes", {
  id: text("id").primaryKey().notNull(),
  model: text("model").notNull(),
  rideClass: text("ride_class"),
  estimatedRangeKm: doublePrecision("estimated_range_km").notNull(),
  topSpeedKmh: integer("top_speed_kmh").notNull(),
  pricingLabel: text("pricing_label").notNull(),
  status: bikeStatus("status").notNull().default("available"),
  location: text("location").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  lastReportedAt: timestamp("last_reported_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export type ProfileRow = typeof profiles.$inferSelect;
export type BikeRow = typeof bikes.$inferSelect;

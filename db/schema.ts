import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const referrals = sqliteTable(
  "referrals",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    referrerName: text("referrer_name").notNull(),
    referrerPhone: text("referrer_phone").notNull(),
    referrerEmail: text("referrer_email").notNull().default(""),
    supporterName: text("supporter_name").notNull(),
    supporterPhone: text("supporter_phone").notNull(),
    supporterAddress: text("supporter_address").notNull(),
    supporterPostal: text("supporter_postal").notNull().default(""),
    ward: text("ward").notNull().default("Ward 6 or 11"),
    supportLevel: text("support_level").notNull().default("Needs follow-up"),
    consentToContact: integer("consent_to_contact", { mode: "boolean" })
      .notNull()
      .default(false),
    status: text("status").notNull().default("New"),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_referrals_created_at").on(table.createdAt),
    index("idx_referrals_status_ward").on(table.status, table.ward),
  ]
);

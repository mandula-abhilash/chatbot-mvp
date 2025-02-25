/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Ensure uuid-ossp extension is enabled
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  return knex.schema.createTable("whatsapp_messages", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));

    table
      .uuid("business_id")
      .references("id")
      .inTable("businesses")
      .onDelete("CASCADE")
      .notNullable();

    table
      .uuid("session_id")
      .references("id")
      .inTable("user_sessions")
      .onDelete("CASCADE")
      .notNullable();

    table.string("phone_number", 20).notNullable();

    table.enum("message_direction", ["incoming", "outgoing"]).notNullable();

    table.text("message_text").notNullable();

    table
      .enum("message_type", [
        "text",
        "interactive",
        "template",
        "button",
        "image",
        "video",
        "audio",
      ])
      .defaultTo("text");

    table
      .enum("message_status", ["sent", "delivered", "read", "failed"])
      .defaultTo("sent");

    table.jsonb("metadata").defaultTo("{}"); // Stores additional message info (e.g., buttons, media URLs)

    table.timestamp("received_at").defaultTo(knex.fn.now());
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    // Add indexes for better query performance
    table.index(["business_id", "phone_number"]);
    table.index("session_id");
    table.index("received_at");
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  return knex.schema.dropTableIfExists("whatsapp_messages");
}

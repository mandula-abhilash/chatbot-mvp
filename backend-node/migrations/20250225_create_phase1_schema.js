/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  /*
      # Recreate tables with string IDs for Facebook business integration
  
      1. Changes
        - Drop existing tables in correct order
        - Recreate all tables with string IDs instead of UUIDs
        - Maintain all relationships and constraints
        
      2. Tables Modified (in order)
        - whatsapp_messages
        - user_sessions
        - business_greetings
        - business_hours
        - business_services
        - business_faqs
        - businesses
  
      Note: This is a destructive migration that requires dropping and recreating
      tables. Ensure you have backed up any existing data before running.
    */

  // Drop tables in reverse order of dependencies
  await knex.schema
    .dropTableIfExists("whatsapp_messages")
    .dropTableIfExists("user_sessions")
    .dropTableIfExists("business_greetings")
    .dropTableIfExists("business_hours")
    .dropTableIfExists("business_services")
    .dropTableIfExists("business_faqs")
    .dropTableIfExists("businesses");

  // Create businesses table with string ID
  await knex.schema.createTable("businesses", (table) => {
    table.string("id", 255).primary();
    table.string("name", 255).notNullable();
    table.text("description");
    table.string("website_url", 255);
    table.string("phone", 20);
    table.string("email", 255).unique();
    table.text("address");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  // Recreate business_faqs table
  await knex.schema.createTable("business_faqs", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
    table
      .string("business_id", 255)
      .references("id")
      .inTable("businesses")
      .onDelete("CASCADE");
    table.text("question").notNullable();
    table.text("answer").notNullable();
    table.string("category", 50);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  // Recreate business_services table
  await knex.schema.createTable("business_services", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
    table
      .string("business_id", 255)
      .references("id")
      .inTable("businesses")
      .onDelete("CASCADE");
    table.string("name", 255).notNullable();
    table.text("description").notNullable();
    table.decimal("price", 10, 2);
    table.boolean("is_active").defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  // Recreate business_hours table
  await knex.schema.createTable("business_hours", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
    table
      .string("business_id", 255)
      .references("id")
      .inTable("businesses")
      .onDelete("CASCADE");
    table
      .string("day_of_week", 10)
      .notNullable()
      .checkIn([
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ]);
    table.time("open_time").nullable();
    table.time("close_time").nullable();
    table.boolean("is_closed").defaultTo(false);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  // Recreate business_greetings table
  await knex.schema.createTable("business_greetings", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
    table
      .string("business_id", 255)
      .references("id")
      .inTable("businesses")
      .onDelete("CASCADE")
      .notNullable();
    table.text("greeting_message").notNullable();
    table.specificType("example_questions", "text[]");
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  // Recreate user_sessions table
  await knex.schema.createTable("user_sessions", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
    table
      .string("business_id", 255)
      .references("id")
      .inTable("businesses")
      .onDelete("CASCADE")
      .notNullable();
    table.string("phone_number", 20).notNullable();
    table.text("last_message");
    table.jsonb("context").defaultTo("{}");
    table.boolean("is_active").defaultTo(true);
    table.timestamp("started_at").defaultTo(knex.fn.now());
    table.timestamp("ended_at").nullable();
  });

  // Recreate whatsapp_messages table
  await knex.schema.createTable("whatsapp_messages", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
    table
      .string("business_id", 255)
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
    table.jsonb("metadata").defaultTo("{}");
    table.timestamp("received_at").defaultTo(knex.fn.now());
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    // Add indexes
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
  // Drop tables in reverse order
  return knex.schema
    .dropTableIfExists("whatsapp_messages")
    .dropTableIfExists("user_sessions")
    .dropTableIfExists("business_greetings")
    .dropTableIfExists("business_hours")
    .dropTableIfExists("business_services")
    .dropTableIfExists("business_faqs")
    .dropTableIfExists("businesses");
}

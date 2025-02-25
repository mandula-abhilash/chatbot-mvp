/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Ensure uuid-ossp extension is enabled
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  return (
    knex.schema

      // Create user_sessions table
      .createTable("user_sessions", (table) => {
        table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
        table
          .uuid("business_id")
          .references("id")
          .inTable("businesses")
          .onDelete("CASCADE")
          .notNullable();
        table.string("phone_number", 20).notNullable();
        table.text("last_message"); // Stores the last received message from the user
        table.jsonb("context").defaultTo("{}"); // Stores session context (e.g., booking progress)
        table.boolean("is_active").defaultTo(true); // Tracks if session is ongoing
        table.timestamp("started_at").defaultTo(knex.fn.now()); // When the session started
        table.timestamp("ended_at").nullable(); // When the session ended
      })

      // Create business_greetings table
      .createTable("business_greetings", (table) => {
        table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
        table
          .uuid("business_id")
          .references("id")
          .inTable("businesses")
          .onDelete("CASCADE")
          .notNullable();
        table.text("greeting_message").notNullable();
        table.specificType("example_questions", "text[]"); // Stores example questions
        table.timestamp("created_at").defaultTo(knex.fn.now());
        table.timestamp("updated_at").defaultTo(knex.fn.now());
      })
  );
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  return knex.schema
    .dropTableIfExists("business_greetings")
    .dropTableIfExists("user_sessions");
}

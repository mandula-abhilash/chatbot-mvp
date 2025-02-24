/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // First, ensure the uuid-ossp extension is enabled
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  return (
    knex.schema
      // Create businesses table
      .createTable("businesses", (table) => {
        table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
        table.string("name", 255).notNullable();
        table.text("description");
        table.string("website_url", 255);
        table.string("phone", 20);
        table.string("email", 255).unique();
        table.text("address");
        table.timestamp("created_at").defaultTo(knex.fn.now());
        table.timestamp("updated_at").defaultTo(knex.fn.now());
      })

      // Create business_faqs table
      .createTable("business_faqs", (table) => {
        table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
        table
          .uuid("business_id")
          .references("id")
          .inTable("businesses")
          .onDelete("CASCADE");
        table.text("question").notNullable();
        table.text("answer").notNullable();
        table.string("category", 50);
        table.timestamp("created_at").defaultTo(knex.fn.now());
        table.timestamp("updated_at").defaultTo(knex.fn.now());
      })

      // Create business_services table
      .createTable("business_services", (table) => {
        table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
        table
          .uuid("business_id")
          .references("id")
          .inTable("businesses")
          .onDelete("CASCADE");
        table.string("name", 255).notNullable();
        table.text("description").notNullable();
        table.decimal("price", 10, 2);
        table.boolean("is_active").defaultTo(true);
        table.timestamp("created_at").defaultTo(knex.fn.now());
        table.timestamp("updated_at").defaultTo(knex.fn.now());
      })

      // Create business_hours table
      .createTable("business_hours", (table) => {
        table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
        table
          .uuid("business_id")
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
        table.time("open_time").notNullable();
        table.time("close_time").notNullable();
        table.boolean("is_closed").defaultTo(false);
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
    .dropTableIfExists("business_hours")
    .dropTableIfExists("business_services")
    .dropTableIfExists("business_faqs")
    .dropTableIfExists("businesses");
}

# Knex Database Guide

This guide explains how to use Knex.js for database migrations and management in our project.

## Prerequisites

- Node.js installed
- PostgreSQL database running
- Project dependencies installed (`npm install`)

## Database Setup

### 1. Enable Required PostgreSQL Extensions

Before running migrations, ensure required PostgreSQL extensions are enabled. Connect to your database and run:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

This enables UUID generation functionality needed for our schema.

## Working with Migrations

### 1. Create a New Migration

```bash
npm run migrate:make -- create_your_table_name
```

This creates a new migration file in the `migrations` directory with a timestamp prefix.

### 2. Writing Migrations

Migration files export two functions:

- `up()`: Applies the changes
- `down()`: Reverts the changes

Example migration structure:

```javascript
export async function up(knex) {
  // First, ensure extensions
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  return knex.schema.createTable("table_name", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
    table.string("name").notNullable();
    table.timestamps(true, true);
  });
}

export async function down(knex) {
  return knex.schema.dropTableIfExists("table_name");
}
```

### 3. Running Migrations

```bash
# Run all pending migrations (Main command)
npm run migrate:latest

# Rollback the last batch of migrations
npm run migrate:rollback

# Rollback all migrations
npm run migrate:rollback --all
```

## Common Migration Patterns

### UUID Primary Keys

Always use UUID for primary keys:

```javascript
table.uuid("id").primary().defaultTo(knex.raw("uuid_generate_v4()"));
```

### Foreign Keys

When creating foreign key relationships:

```javascript
table
  .uuid("related_id")
  .references("id")
  .inTable("related_table")
  .onDelete("CASCADE");
```

### Timestamps

Add created_at and updated_at columns:

```javascript
table.timestamp("created_at").defaultTo(knex.fn.now());
table.timestamp("updated_at").defaultTo(knex.fn.now());
```

## Best Practices

1. **Always Test Migrations**: Test both `up()` and `down()` migrations to ensure they work correctly.

2. **Atomic Changes**: Each migration should be focused and atomic, doing one specific thing.

3. **Never Edit Existing Migrations**: Once a migration is in production, never edit it. Create a new migration instead.

4. **Use Extension Check**: Always check for required extensions at the start of migrations:

   ```javascript
   await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
   ```

5. **Descriptive Names**: Use clear, descriptive names for migration files:
   - ✅ `create_users_table`
   - ✅ `add_email_to_users`
   - ❌ `update_db`

## Troubleshooting

### Common Issues

1. **Type Mismatch in Foreign Keys**:
   Ensure both primary and foreign key columns use the same data type (e.g., both UUID).

2. **Extension Not Found**:
   Make sure to create required extensions before running migrations.

3. **Migration Failed**:
   ```bash
   # Rollback and retry
   npm run migrate:rollback
   npm run migrate:latest
   ```

### Checking Migration Status

To see which migrations have been run:

# Main command to check the status

```bash
npx knex migrate:status
```

## Environment Configuration

Knex configuration uses environment variables from `.env`:

```env
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=your_database
PG_USER=your_user
PG_PASSWORD=your_password
```

Make sure these are set before running migrations.

## Useful Commands

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

SELECT * FROM pg_extension;

SELECT uuid_generate_v4();

SELECT * FROM knex_migrations ORDER BY id DESC LIMIT 4;
```

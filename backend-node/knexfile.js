import dotenv from "dotenv";

dotenv.config();

export default {
  development: {
    client: "postgresql",
    connection: {
      host: process.env.PG_HOST || "localhost",
      port: process.env.PG_PORT || 5432,
      database: process.env.PG_DATABASE || "fgb_acumen",
      user: process.env.PG_USER || "postgres",
      password: process.env.PG_PASSWORD || "postgres",
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./migrations",
    },
    seeds: {
      directory: "./seeds",
    },
  },
  production: {
    client: "postgresql",
    connection: {
      host: process.env.PG_HOST,
      port: process.env.PG_PORT,
      database: process.env.PG_DATABASE,
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./migrations",
    },
  },
};

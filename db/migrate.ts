/**
 * Minimal migration runner. Applies db/migrations/*.sql in order against
 * SUPABASE_DB_URL. Idempotency is the migration author's responsibility for PR1
 * (0001 uses CREATE TYPE/TABLE without IF NOT EXISTS — run once on a fresh DB).
 *
 * Usage: npm run migrate
 */
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error("SUPABASE_DB_URL is not set. See .env.example.");
    process.exit(1);
  }

  const migrationsDir = join(__dirname, "migrations");
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    for (const file of files) {
      const sql = await readFile(join(migrationsDir, file), "utf8");
      console.log(`Applying ${file}...`);
      await client.query(sql);
      console.log(`  ✓ ${file}`);
    }
    console.log("All migrations applied.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

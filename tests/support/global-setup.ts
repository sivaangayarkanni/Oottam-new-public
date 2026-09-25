/**
 * Applies migrations to the dedicated test database (TEST_DATABASE_URL) before the suite runs.
 * The dev/prod DATABASE_URL is never touched by tests.
 */
import "dotenv/config";
import { execSync } from "node:child_process";

export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.warn("[tests] TEST_DATABASE_URL not set: integration tests will be skipped.");
    return;
  }
  if (url === process.env.DATABASE_URL) throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL");
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}

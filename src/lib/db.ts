import type { PrismaClient } from "@/generated/prisma/client";

/** Services take the client as a parameter so they can run against a test database. */
export type Db = PrismaClient;
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

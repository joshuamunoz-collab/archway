import path from 'node:path'
import { defineConfig } from 'prisma/config'
// Load .env before Prisma evaluates this config (Prisma CLI may not have
// populated process.env from .env yet when this module is first imported).
import 'dotenv/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    // DIRECT_URL = non-pooled Supabase connection, required for Prisma Migrate.
    // Session-mode pooler (port 5432) supports DDL and works for Migrate.
    // The direct IPv6 host is unreachable on many networks.
    url: process.env.DATABASE_URL,
  },
})

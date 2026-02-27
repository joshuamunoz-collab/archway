import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Limit pool size for Vercel serverless — prevents exhausting Supabase
    // session-mode connection limits when multiple function instances run.
    max: 2,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// Cache in both dev AND production so warm Vercel invocations reuse the pool
export const prisma = globalForPrisma.prisma ?? createPrismaClient()
if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma

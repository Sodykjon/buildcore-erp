import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Reuse a single connection pool across all requests and hot reloads
const globalForPrisma = globalThis as unknown as {
  pool:   Pool         | undefined
  prisma: PrismaClient | undefined
}

const pool = globalForPrisma.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl:              { rejectUnauthorized: false },
  max:              5,    // max concurrent connections
  idleTimeoutMillis: 30000,
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.pool = pool

const adapter = new PrismaPg(pool)

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

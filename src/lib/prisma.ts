import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var _prismaPool:   Pool         | undefined
  // eslint-disable-next-line no-var
  var _prismaClient: PrismaClient | undefined
}

function createPrisma(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    // Build-time stub — never actually called during real requests
    return new PrismaClient()
  }
  const pool = global._prismaPool ?? (global._prismaPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  }))
  return new PrismaClient({ adapter: new PrismaPg(pool) })
}

export const prisma: PrismaClient =
  global._prismaClient ?? (global._prismaClient = createPrisma())

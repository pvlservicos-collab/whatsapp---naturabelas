import { neon, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

neonConfig.fetchConnectionCache = true

const databaseUrl = process.env.DATABASE_URL || process.env.whatsapp_DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL não definida nas variáveis de ambiente')
}

export const db = drizzle(neon(databaseUrl), { schema })
export type DB = typeof db

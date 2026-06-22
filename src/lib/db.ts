import { neon, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

neonConfig.fetchConnectionCache = true

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null

function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL || process.env.whatsapp_DATABASE_URL
    if (!url) throw new Error('DATABASE_URL não definida nas variáveis de ambiente')
    _db = drizzle(neon(url), { schema })
  }
  return _db
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return (getDb() as any)[prop]
  },
})

export type DB = typeof db

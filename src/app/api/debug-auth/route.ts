import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  const url = process.env.DATABASE_URL || process.env.whatsapp_DATABASE_URL || ''

  // Mostra só o host, sem senha
  let dbHost = 'não definida'
  try { dbHost = new URL(url).hostname } catch {}

  let userCount = 0
  let userEmails: string[] = []
  let dbError = ''

  try {
    const sql = neon(url)
    const rows = await sql`SELECT email FROM users LIMIT 10`
    userCount = rows.length
    userEmails = rows.map((r: any) => r.email)
  } catch (e: any) {
    dbError = e.message
  }

  return NextResponse.json({ dbHost, userCount, userEmails, dbError })
}

import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

export async function GET() {
  const url = process.env.DATABASE_URL || process.env.whatsapp_DATABASE_URL || ''

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

export async function POST(req: Request) {
  const url = process.env.DATABASE_URL || process.env.whatsapp_DATABASE_URL || ''
  const { email, password } = await req.json()

  try {
    const sql = neon(url)
    const hash = await bcrypt.hash(password, 12)

    const [user] = await sql`
      INSERT INTO users (id, email, password_hash)
      VALUES (gen_random_uuid(), ${email}, ${hash})
      ON CONFLICT (email) DO UPDATE SET password_hash = ${hash}
      RETURNING id
    `
    await sql`
      INSERT INTO profiles (id, full_name, is_superadmin)
      VALUES (${user.id}, ${email}, true)
      ON CONFLICT (id) DO UPDATE SET is_superadmin = true
    `
    return NextResponse.json({ ok: true, email })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

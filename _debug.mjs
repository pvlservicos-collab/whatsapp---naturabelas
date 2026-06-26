import { Pool } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_YoV9qFaEuw8K@ep-tiny-dawn-ace0au8b-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' })

const email = 'sr.viniciusfernandes@gmail.com'
const password = 'vini'

const { rows } = await pool.query(
  `SELECT u.id, u.email, u.password_hash, p.full_name, p.is_superadmin,
          m.organization_id, m.status as member_status
   FROM users u
   LEFT JOIN profiles p ON p.id = u.id
   LEFT JOIN organization_members m ON m.user_id = u.id
   WHERE u.email = $1`, [email]
)

if (rows.length === 0) {
  console.log('USUÁRIO NÃO ENCONTRADO no banco!')
} else {
  const u = rows[0]
  console.log('Usuário encontrado:', u.email)
  console.log('  ID:', u.id)
  console.log('  Superadmin:', u.is_superadmin)
  console.log('  Org ID:', u.organization_id)
  console.log('  Membro status:', u.member_status)
  console.log('  Hash existe:', !!u.password_hash)

  const valid = await bcrypt.compare(password, u.password_hash)
  console.log('  Senha correta:', valid)
}

await pool.end()

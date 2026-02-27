/**
 * One-time script: provision the 4 Archway user accounts.
 *
 * Usage:
 *   1. Set TEMP_PASSWORD below to a strong temporary password.
 *   2. Run: node --env-file=.env.local scripts/create-users.mjs
 *   3. Each user should change their password after first login.
 *   4. Delete or archive this file once done.
 */

import { createClient } from '@supabase/supabase-js'

// ── Set this before running ────────────────────────────────────────────────
const TEMP_PASSWORD = 'CHANGE_ME_BEFORE_RUNNING'
// ──────────────────────────────────────────────────────────────────────────

const USERS = [
  { email: 'josh@capegirardeaulaw.com',  fullName: 'Josh Munoz',    role: 'admin' },
  { email: 'mcmullin.mark@gmail.com',    fullName: 'Mark McMullin', role: 'admin' },
  { email: 'mark@capegirardeaulaw.com',  fullName: 'Mark McMullin', role: 'staff' },
  { email: 'va@capegirardeaulaw.com',    fullName: 'Gladys Reyes',  role: 'staff' },
]

if (TEMP_PASSWORD === 'CHANGE_ME_BEFORE_RUNNING') {
  console.error('ERROR: Set TEMP_PASSWORD in this script before running.')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

for (const user of USERS) {
  console.log(`\nCreating ${user.fullName} (${user.email}) as ${user.role}…`)

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: user.email,
    password: TEMP_PASSWORD,
    email_confirm: true,
  })

  if (authError) {
    console.error(`  ✗ Auth error: ${authError.message}`)
    continue
  }

  const userId = authData.user.id
  console.log(`  ✓ Auth user created: ${userId}`)

  // 2. Insert user_profiles row (id must match auth.users)
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      email: user.email,
      full_name: user.fullName,
      role: user.role,
    })

  if (profileError) {
    console.error(`  ✗ Profile error: ${profileError.message}`)
  } else {
    console.log(`  ✓ Profile created (role: ${user.role})`)
  }
}

console.log('\nDone. Remind all users to change their password after first login.')

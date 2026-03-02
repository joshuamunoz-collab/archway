import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export interface AuthResult {
  user: { id: string }
  profile: { id: string; role: string; email: string; fullName: string }
}

/** Verify the request is authenticated and return user + profile. */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.userProfile.findUnique({ where: { id: user.id } })
  if (!profile || !profile.isActive) {
    return NextResponse.json({ error: 'Account inactive' }, { status: 403 })
  }

  return { user, profile }
}

/** Verify the request is from an admin user. */
export async function requireAdmin(): Promise<AuthResult | NextResponse> {
  const result = await requireAuth()
  if (result instanceof NextResponse) return result
  if (result.profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return result
}

// ── Input validation helpers ────────────────────────────────────────────

/** Validate and truncate a string. Returns null if empty after trim. */
export function sanitizeString(val: unknown, maxLength = 500): string | null {
  if (val === null || val === undefined) return null
  const s = String(val).trim()
  if (!s) return null
  return s.slice(0, maxLength)
}

/** Parse and validate a financial amount. Returns null if invalid. */
export function parseAmount(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = Number(val)
  if (!Number.isFinite(n)) return null
  if (n < 0) return null
  // Cap at reasonable financial amount (100 million)
  if (n > 100_000_000) return null
  return Math.round(n * 100) / 100
}

/** Parse and validate an integer (e.g., year, count). */
export function parseIntSafe(val: unknown, min = 0, max = 100_000): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = parseInt(String(val), 10)
  if (!Number.isFinite(n)) return null
  if (n < min || n > max) return null
  return n
}

/** Validate a date string. Returns Date or null. */
export function parseDate(val: unknown): Date | null {
  if (!val) return null
  const d = new Date(String(val))
  if (isNaN(d.getTime())) return null
  // Reject dates too far in the past or future (1900-2100)
  if (d.getFullYear() < 1900 || d.getFullYear() > 2100) return null
  return d
}

/** Validate that a value is one of the allowed options. */
export function validateEnum<T extends string>(val: unknown, allowed: T[]): T | null {
  if (!val) return null
  const s = String(val).trim().toLowerCase()
  return allowed.includes(s as T) ? (s as T) : null
}

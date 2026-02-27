import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { createPmFeeExpense } from '@/lib/pm-fee'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: propertyId } = await params
  const body = await request.json()

  const { date, amount, type, status, leaseId, bankAccountId, referenceNumber, notes } = body

  if (!date || amount == null || !type) {
    return NextResponse.json({ error: 'date, amount, and type are required' }, { status: 400 })
  }

  const payment = await prisma.payment.create({
    data: {
      propertyId,
      leaseId: leaseId || null,
      bankAccountId: bankAccountId || null,
      date: new Date(date),
      amount,
      type,
      status: status || 'received',
      referenceNumber: referenceNumber || null,
      notes: notes || null,
    },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'property',
      entityId: propertyId,
      action: 'payment_recorded',
      details: { type, amount: Number(amount), date },
      userId: user.id,
    },
  })

  // Auto-create PM management fee expense for HAP/copay payments
  if ((status || 'received') === 'received' && ['hap', 'copay'].includes(type)) {
    await createPmFeeExpense({
      propertyId,
      paymentId: payment.id,
      paymentType: type,
      paymentAmount: Number(amount),
      paymentDate: new Date(date),
    })
  }

  return NextResponse.json(payment, { status: 201 })
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: propertyId, paymentId } = await params

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment || payment.propertyId !== propertyId) {
    return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
  }

  await prisma.payment.delete({ where: { id: paymentId } })

  await prisma.activityLog.create({
    data: {
      entityType: 'property',
      entityId: propertyId,
      action: 'payment_deleted',
      details: { type: payment.type, amount: Number(payment.amount) },
      userId: user.id,
    },
  })

  return NextResponse.json({ success: true })
}

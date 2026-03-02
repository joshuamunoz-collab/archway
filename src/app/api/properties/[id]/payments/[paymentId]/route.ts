import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

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
      userId: auth.user.id,
    },
  })

  return NextResponse.json({ success: true })
}

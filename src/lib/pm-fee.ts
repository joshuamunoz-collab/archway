import { prisma } from '@/lib/prisma'

/**
 * Auto-create a PM management fee expense when a HAP or copay payment is recorded.
 * Fee = payment.amount × entity.pmFeePct / 100
 */
export async function createPmFeeExpense({
  propertyId,
  paymentId,
  paymentType,
  paymentAmount,
  paymentDate,
}: {
  propertyId: string
  paymentId: string
  paymentType: string
  paymentAmount: number
  paymentDate: Date
}) {
  // Only HAP and copay are subject to PM fee
  if (!['hap', 'copay'].includes(paymentType)) return

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { entity: { select: { pmFeePct: true } } },
  })
  if (!property) return

  const feePct = Number(property.entity.pmFeePct)
  const feeAmount = Math.round(paymentAmount * feePct) / 100

  if (feeAmount <= 0) return

  await prisma.expense.create({
    data: {
      propertyId,
      date: paymentDate,
      amount: feeAmount,
      category: 'professional_services',
      subcategory: 'pm_management_fee',
      description: `PM fee (${feePct}%) on ${paymentType === 'hap' ? 'HAP' : 'copay'} payment — ref: ${paymentId.slice(0, 8)}`,
      source: 'auto_pm_fee',
    },
  })
}

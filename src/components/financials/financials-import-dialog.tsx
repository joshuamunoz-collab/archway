'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PaymentsImporter } from '@/components/import/payments-importer'
import { ExpensesImporter } from '@/components/import/expenses-importer'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FinancialsImportDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Transactions</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="payments">
          <TabsList>
            <TabsTrigger value="payments">Payments (Income)</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>
          <TabsContent value="payments" className="mt-4">
            <PaymentsImporter />
          </TabsContent>
          <TabsContent value="expenses" className="mt-4">
            <ExpensesImporter />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

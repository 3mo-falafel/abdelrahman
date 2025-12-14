"use client"

import { useState } from "react"
import type { Order } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/types"
import { CreditCard, Wallet } from "lucide-react"

interface AddPaymentDialogProps {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddPaymentDialog({ order, open, onOpenChange }: AddPaymentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const paymentAmount = Number.parseFloat(amount)
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error("الرجاء إدخال مبلغ صحيح")
      return
    }

    if (paymentAmount > Number(order.remaining_amount)) {
      toast.error("المبلغ المدخل أكبر من المبلغ المتبقي")
      return
    }

    setLoading(true)
    const supabase = createClient()

    // إضافة الدفعة إلى السجل
    const { error: paymentError } = await supabase.from("payment_history").insert({
      order_id: order.id,
      payment_amount: paymentAmount,
      notes: notes.trim() || null,
    })

    if (paymentError) {
      toast.error("حدث خطأ في إضافة الدفعة")
      setLoading(false)
      return
    }

    // تحديث الطلب
    const newPaidAmount = Number(order.paid_amount) + paymentAmount

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        paid_amount: newPaidAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)

    if (updateError) {
      toast.error("حدث خطأ في تحديث الطلب")
      setLoading(false)
      return
    }

    toast.success("تم إضافة الدفعة بنجاح")
    onOpenChange(false)
    setAmount("")
    setNotes("")
    router.refresh()
    setLoading(false)
  }

  const handleQuickAmount = (percentage: number) => {
    const calculatedAmount = (Number(order.remaining_amount) * percentage) / 100
    setAmount(calculatedAmount.toFixed(2))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">إضافة دفعة - طلب #{order.order_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* معلومات الطلب */}
          <div className="bg-muted p-4 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">العميل:</span>
              <span className="font-medium text-text">{order.customer_name || "غير محدد"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">الإجمالي:</span>
              <span className="font-bold text-text">{formatCurrency(order.total_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">مدفوع:</span>
              <span className="font-bold text-success">{formatCurrency(order.paid_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">المتبقي:</span>
              <span className="font-bold text-danger text-lg">{formatCurrency(order.remaining_amount)}</span>
            </div>
          </div>

          {/* أزرار سريعة */}
          <div>
            <Label className="text-sm text-text-muted mb-2 block">مبالغ سريعة</Label>
            <div className="grid grid-cols-4 gap-2">
              <Button type="button" variant="outline" onClick={() => handleQuickAmount(25)} className="rounded-lg">
                25%
              </Button>
              <Button type="button" variant="outline" onClick={() => handleQuickAmount(50)} className="rounded-lg">
                50%
              </Button>
              <Button type="button" variant="outline" onClick={() => handleQuickAmount(75)} className="rounded-lg">
                75%
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAmount(order.remaining_amount.toString())}
                className="rounded-lg"
              >
                الكل
              </Button>
            </div>
          </div>

          {/* مبلغ الدفعة */}
          <div>
            <Label htmlFor="amount" className="text-text mb-2 block">
              مبلغ الدفعة <span className="text-danger">*</span>
            </Label>
            <div className="relative">
              <Wallet className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={order.remaining_amount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pr-10 text-lg rounded-xl"
                required
              />
            </div>
          </div>

          {/* ملاحظات */}
          <div>
            <Label htmlFor="notes" className="text-text mb-2 block">
              ملاحظات (اختياري)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف ملاحظات حول الدفعة..."
              className="rounded-xl resize-none"
              rows={3}
            />
          </div>

          {/* أزرار التحكم */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl"
              disabled={loading}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-primary hover:bg-primary-light rounded-xl">
              {loading ? "جاري الإضافة..." : "إضافة الدفعة"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState } from "react"
import { RotateCcw, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { Order, OrderItem } from "@/lib/types"
import { formatCurrency } from "@/lib/types"

interface ReturnOrderDialogProps {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "return" | "replace"
}

export function ReturnOrderDialog({ order, open, onOpenChange, type }: ReturnOrderDialogProps) {
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState("")
  const [refundAmount, setRefundAmount] = useState(order.paid_amount.toString())
  const router = useRouter()

  const isReturn = type === "return"
  const title = isReturn ? "إرجاع الطلب" : "استبدال الطلب"
  const description = isReturn 
    ? "سيتم إرجاع المنتجات للمخزون واسترداد المبلغ المدفوع"
    : "سيتم إرجاع المنتجات للمخزون واستبدالها بمنتجات أخرى"

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("الرجاء إدخال سبب الإرجاع/الاستبدال")
      return
    }

    const refund = Number.parseFloat(refundAmount) || 0
    if (isReturn && refund < 0) {
      toast.error("مبلغ الاسترداد غير صحيح")
      return
    }

    if (isReturn && refund > order.paid_amount) {
      toast.error("مبلغ الاسترداد لا يمكن أن يكون أكبر من المبلغ المدفوع")
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // 1. Get order items to restore stock
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id)

      // 2. Restore product quantities
      if (items && items.length > 0) {
        for (const item of items as OrderItem[]) {
          if (item.product_id) {
            // Get current product quantity
            const { data: product } = await supabase
              .from("products")
              .select("quantity")
              .eq("id", item.product_id)
              .single()

            if (product) {
              // Add back the quantity
              await supabase
                .from("products")
                .update({ 
                  quantity: product.quantity + item.quantity,
                  updated_at: new Date().toISOString()
                })
                .eq("id", item.product_id)
            }
          }
        }
      }

      // 3. Update order status
      const { error } = await supabase
        .from("orders")
        .update({
          status: isReturn ? "مرتجع" : "مستبدل",
          return_reason: reason.trim(),
          returned_at: new Date().toISOString(),
          refund_amount: isReturn ? refund : 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)

      if (error) throw error

      toast.success(isReturn ? "تم إرجاع الطلب بنجاح" : "تم تسجيل الاستبدال بنجاح")
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error("Error:", error)
      toast.error("حدث خطأ أثناء العملية")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isReturn ? (
              <RotateCcw className="text-orange-500" size={24} />
            ) : (
              <RefreshCw className="text-purple-500" size={24} />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Info */}
          <div className="bg-muted p-4 rounded-xl space-y-2">
            <p className="font-bold text-text">طلب #{order.order_number}</p>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">قيمة الطلب:</span>
              <span className="font-medium">{formatCurrency(order.total_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">المبلغ المدفوع:</span>
              <span className="font-medium text-success">{formatCurrency(order.paid_amount)}</span>
            </div>
            {order.customer_name && (
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">العميل:</span>
                <span className="font-medium">{order.customer_name}</span>
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              سبب {isReturn ? "الإرجاع" : "الاستبدال"} <span className="text-danger">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`اكتب سبب ${isReturn ? "الإرجاع" : "الاستبدال"}...`}
              className="min-h-[80px]"
            />
          </div>

          {/* Refund Amount - Only for returns */}
          {isReturn && (
            <div className="space-y-2">
              <Label htmlFor="refund">مبلغ الاسترداد</Label>
              <Input
                id="refund"
                type="number"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-text-muted">
                الحد الأقصى للاسترداد: {formatCurrency(order.paid_amount)}
              </p>
            </div>
          )}

          {/* Warning */}
          <div className={`p-3 rounded-lg ${isReturn ? "bg-orange-50 border border-orange-200" : "bg-purple-50 border border-purple-200"}`}>
            <p className={`text-sm ${isReturn ? "text-orange-700" : "text-purple-700"}`}>
              ⚠️ سيتم إرجاع كميات المنتجات إلى المخزون تلقائياً
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            إلغاء
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className={isReturn ? "bg-orange-500 hover:bg-orange-600" : "bg-purple-500 hover:bg-purple-600"}
          >
            {loading ? "جاري المعالجة..." : isReturn ? "تأكيد الإرجاع" : "تأكيد الاستبدال"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

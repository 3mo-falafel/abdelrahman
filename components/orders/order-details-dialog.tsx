"use client"

import { useState, useEffect } from "react"
import { Package, User, CreditCard, Tag } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import type { Order, OrderItem } from "@/lib/types"
import { formatCurrency, formatDate, getOrderStatusColor, getPaymentStatusColor } from "@/lib/types"

interface OrderDetailsDialogProps {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderDetailsDialog({ order, open, onOpenChange }: OrderDetailsDialogProps) {
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open) {
      fetchItems()
    }
  }, [open, order.id])

  const fetchItems = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase.from("order_items").select("*").eq("order_id", order.id)
    setItems((data || []) as OrderItem[])
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3 flex-wrap">
            تفاصيل طلب #{order.order_number}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getOrderStatusColor(order.status)}`}>
              {order.status}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(order.payment_status)}`}>
              {order.payment_status}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* معلومات العميل والدفع */}
          <div className="bg-muted rounded-xl p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <User size={16} className="text-text-muted" />
                <span className="text-text-muted">العميل:</span>
                <span className="font-medium text-text">{order.customer_name || "غير محدد"}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-text-muted" />
                <span className="text-text-muted">حالة الدفع:</span>
                <span className="font-medium text-text">{order.payment_status}</span>
              </div>
            </div>
          </div>

          {/* معلومات الطلب */}
          <div className="bg-muted rounded-xl p-4">
            <p className="text-text-muted mb-3">تاريخ الطلب: {formatDate(order.created_at)}</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-text-muted">المبلغ</p>
                <p className="text-xl font-bold text-text">{formatCurrency(order.total_amount)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-text-muted">التكلفة</p>
                <p className="text-xl font-bold text-text-muted">{formatCurrency(order.total_cost)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-text-muted">الربح</p>
                <p className="text-xl font-bold text-success">{formatCurrency(order.total_profit)}</p>
              </div>
            </div>
          </div>

          {/* تفاصيل الدفع */}
          {order.payment_status !== "مدفوع" && (
            <div className="bg-gradient-to-r from-warning/10 to-danger/10 border border-warning/20 rounded-xl p-4">
              <h4 className="font-bold text-text mb-3 flex items-center gap-2">
                <CreditCard size={18} />
                تفاصيل الدفع
              </h4>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="text-center">
                  <p className="text-text-muted">الإجمالي</p>
                  <p className="font-bold text-text">{formatCurrency(order.total_amount)}</p>
                </div>
                <div className="text-center">
                  <p className="text-text-muted">المدفوع</p>
                  <p className="font-bold text-success">{formatCurrency(order.paid_amount)}</p>
                </div>
                <div className="text-center">
                  <p className="text-text-muted">المتبقي</p>
                  <p className="font-bold text-danger">{formatCurrency(order.remaining_amount)}</p>
                </div>
              </div>
              {/* شريط التقدم */}
              <div className="mt-3">
                <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-success to-primary transition-all"
                    style={{ width: `${(Number(order.paid_amount) / Number(order.total_amount)) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-text-muted text-center mt-1">
                  {((Number(order.paid_amount) / Number(order.total_amount)) * 100).toFixed(1)}% مدفوع
                </p>
              </div>
            </div>
          )}

          {/* عناصر الطلب */}
          <h3 className="font-bold text-lg text-text mb-3">عناصر الطلب</h3>
          {loading ? (
            <p className="text-center text-text-muted py-4">جاري التحميل...</p>
          ) : items.length === 0 ? (
            <p className="text-center text-text-muted py-4">لا توجد عناصر</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {items.map((item) => {
                const hasDiscount = item.custom_price && item.custom_price < item.unit_price
                return (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-border flex items-center justify-center">
                        <Package size={16} className="text-text-muted" />
                      </div>
                      <div>
                        <p className="font-medium text-text">{item.product_name}</p>
                        <p className="text-sm text-text-muted">
                          {item.quantity} × {formatCurrency(item.custom_price || item.unit_price)}
                        </p>
                        {hasDiscount && (
                          <p className="text-xs text-warning flex items-center gap-1">
                            <Tag size={12} />
                            خصم: {formatCurrency(item.discount_amount)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-text">{formatCurrency(item.total_price)}</p>
                      <p className="text-sm text-success">ربح: {formatCurrency(item.profit)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

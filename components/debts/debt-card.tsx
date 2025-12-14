"use client"

import { useState } from "react"
import type { Order, PaymentHistory } from "@/lib/types"
import { formatCurrency, formatDate, getPaymentStatusColor } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { DollarSign, Calendar, Eye, CreditCard } from "lucide-react"
import { OrderDetailsDialog } from "@/components/orders/order-details-dialog"

interface DebtCardProps {
  order: Order
  onPayment: () => void
  paymentHistory: PaymentHistory[]
}

export function DebtCard({ order, onPayment, paymentHistory }: DebtCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  const paymentPercentage = (Number(order.paid_amount) / Number(order.total_amount)) * 100

  return (
    <>
      <div className="bg-background rounded-xl p-4 border border-border hover:border-primary transition-colors">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-bold text-text">طلب #{order.order_number}</p>
            <p className="text-xs text-text-muted flex items-center gap-1 mt-1">
              <Calendar size={12} />
              {formatDate(order.created_at)}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${getPaymentStatusColor(order.payment_status)}`}>
            {order.payment_status}
          </span>
        </div>

        {/* شريط التقدم */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-text-muted mb-1">
            <span>الدفع</span>
            <span>{paymentPercentage.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-success to-primary transition-all duration-300"
              style={{ width: `${paymentPercentage}%` }}
            />
          </div>
        </div>

        {/* المبالغ */}
        <div className="space-y-1 mb-3 text-sm">
          <div className="flex justify-between text-text">
            <span>الإجمالي:</span>
            <span className="font-bold">{formatCurrency(order.total_amount)}</span>
          </div>
          <div className="flex justify-between text-success">
            <span>مدفوع:</span>
            <span className="font-bold">{formatCurrency(order.paid_amount)}</span>
          </div>
          <div className="flex justify-between text-danger">
            <span>متبقي:</span>
            <span className="font-bold">{formatCurrency(order.remaining_amount)}</span>
          </div>
        </div>

        {/* تاريخ الدفعات */}
        {paymentHistory.length > 0 && (
          <div className="mb-3 p-2 bg-muted rounded-lg">
            <p className="text-xs text-text-muted mb-1">آخر دفعة:</p>
            <p className="text-xs text-text font-medium">
              {formatCurrency(paymentHistory[0].payment_amount)} - {formatDate(paymentHistory[0].payment_date)}
            </p>
          </div>
        )}

        {/* الأزرار */}
        <div className="flex gap-2">
          <Button
            onClick={onPayment}
            disabled={Number(order.remaining_amount) <= 0}
            className="flex-1 bg-primary hover:bg-primary-light text-white rounded-lg"
            size="sm"
          >
            <CreditCard size={14} className="ml-1" />
            إضافة دفعة
          </Button>
          <Button onClick={() => setShowDetails(true)} variant="outline" size="sm" className="rounded-lg">
            <Eye size={14} />
          </Button>
        </div>
      </div>

      {showDetails && <OrderDetailsDialog order={order} open={showDetails} onOpenChange={setShowDetails} />}
    </>
  )
}

"use client"

import { useState, useMemo } from "react"
import type { Order, PaymentHistory } from "@/lib/types"
import { formatCurrency, formatDate, getPaymentStatusColor } from "@/lib/types"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X, Wallet, TrendingUp, Users, AlertCircle } from "lucide-react"
import { StatCard } from "@/components/stat-card"
import { DebtCard } from "./debt-card"
import { AddPaymentDialog } from "./add-payment-dialog"

interface DebtsContentProps {
  orders: Order[]
  paymentHistory: PaymentHistory[]
}

export function DebtsContent({ orders, paymentHistory }: DebtsContentProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const totalDebt = orders.reduce((sum, order) => sum + Number(order.remaining_amount || 0), 0)
    const totalPaid = orders.reduce((sum, order) => sum + Number(order.paid_amount || 0), 0)
    const uniqueCustomers = new Set(orders.map((o) => o.customer_name).filter(Boolean)).size

    return {
      totalDebt,
      totalPaid,
      uniqueCustomers,
      ordersCount: orders.length,
    }
  }, [orders])

  // البحث والفرز
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders

    const query = searchQuery.trim().toLowerCase()
    return orders.filter((order) => {
      const customerMatch = order.customer_name?.toLowerCase().includes(query)
      const orderNumberMatch = order.order_number.toString().includes(query)
      return customerMatch || orderNumberMatch
    })
  }, [searchQuery, orders])

  // تجميع الديون حسب العميل
  const debtsByCustomer = useMemo(() => {
    const grouped = new Map<string, { customer: string; orders: Order[]; totalDebt: number; totalPaid: number }>()

    filteredOrders.forEach((order) => {
      const customer = order.customer_name || "عميل غير محدد"
      if (!grouped.has(customer)) {
        grouped.set(customer, {
          customer,
          orders: [],
          totalDebt: 0,
          totalPaid: 0,
        })
      }
      const entry = grouped.get(customer)!
      entry.orders.push(order)
      entry.totalDebt += Number(order.remaining_amount || 0)
      entry.totalPaid += Number(order.paid_amount || 0)
    })

    return Array.from(grouped.values()).sort((a, b) => b.totalDebt - a.totalDebt)
  }, [filteredOrders])

  return (
    <>
      {/* العنوان وشريط البحث */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text">إدارة الديون</h1>
            <p className="text-text-muted mt-2">تتبع الديون والدفعات للعملاء</p>
          </div>
        </div>

        {/* شريط البحث */}
        <div className="relative max-w-xl">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
          <Input
            type="text"
            placeholder="ابحث عن عميل أو رقم طلب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-12 pl-12 py-6 text-lg rounded-xl border-2 border-border focus:border-primary bg-surface"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
            >
              <X size={20} />
            </Button>
          )}
        </div>
      </div>

      {/* البطاقات الإحصائية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="إجمالي الديون" value={stats.totalDebt} icon={AlertCircle} isCurrency color="danger" />
        <StatCard title="إجمالي المدفوع" value={stats.totalPaid} icon={Wallet} isCurrency color="success" />
        <StatCard title="عدد العملاء" value={stats.uniqueCustomers} icon={Users} color="primary" />
        <StatCard title="عدد الطلبات" value={stats.ordersCount} icon={TrendingUp} color="warning" />
      </div>

      {/* قائمة الديون حسب العميل */}
      {debtsByCustomer.length === 0 ? (
        <div className="bg-surface rounded-2xl p-12 text-center border border-border">
          <AlertCircle size={48} className="mx-auto text-text-muted mb-4" />
          <p className="text-text-muted text-lg">
            {searchQuery ? `لا توجد نتائج للبحث "${searchQuery}"` : "لا توجد ديون مسجلة"}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {debtsByCustomer.map((customerData) => (
            <div key={customerData.customer} className="bg-surface rounded-2xl p-6 shadow-sm border border-border">
              {/* رأس العميل */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                <div>
                  <h3 className="text-xl font-bold text-text">{customerData.customer}</h3>
                  <p className="text-sm text-text-muted mt-1">{customerData.orders.length} طلب</p>
                </div>
                <div className="text-left">
                  <p className="text-sm text-text-muted">الدين المتبقي</p>
                  <p className="text-2xl font-bold text-danger">{formatCurrency(customerData.totalDebt)}</p>
                  <p className="text-xs text-success mt-1">مدفوع: {formatCurrency(customerData.totalPaid)}</p>
                </div>
              </div>

              {/* قائمة الطلبات */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {customerData.orders.map((order) => (
                  <DebtCard
                    key={order.id}
                    order={order}
                    onPayment={() => setSelectedOrder(order)}
                    paymentHistory={paymentHistory.filter((p) => p.order_id === order.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* مربع حوار إضافة دفعة */}
      {selectedOrder && (
        <AddPaymentDialog
          order={selectedOrder}
          open={!!selectedOrder}
          onOpenChange={(open) => !open && setSelectedOrder(null)}
        />
      )}
    </>
  )
}

"use client"

import { useState } from "react"
import { ShoppingCart, Eye, Clock, Search, X, CreditCard, User, RotateCcw, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { OrderDetailsDialog } from "./order-details-dialog"
import { ReturnOrderDialog } from "./return-order-dialog"
import type { Order } from "@/lib/types"
import { formatCurrency, formatDate, getOrderStatusColor, getPaymentStatusColor } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface OrdersListProps {
  orders: Order[]
}

export function OrdersList({ orders }: OrdersListProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [returnOrder, setReturnOrder] = useState<Order | null>(null)
  const [returnType, setReturnType] = useState<"return" | "replace">("return")
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [paymentFilter, setPaymentFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  // Filter orders by status, payment, and search
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === "all" || o.status === statusFilter
    const matchesPayment = paymentFilter === "all" || o.payment_status === paymentFilter
    const matchesSearch = !searchQuery.trim() || 
      o.order_number.toString().includes(searchQuery) ||
      (o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesStatus && matchesPayment && matchesSearch
  })

  const handleStatusChange = async (orderId: string, newStatus: Order["status"]) => {
    setLoadingId(orderId)
    const supabase = createClient()

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", orderId)

    if (error) {
      toast.error("حدث خطأ في تحديث حالة الطلب")
    } else {
      toast.success("تم تحديث حالة الطلب")
      router.refresh()
    }
    setLoadingId(null)
  }

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-border">
      {/* فلاتر وبحث */}
      <div className="p-4 border-b border-border space-y-3">
        {/* بحث */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <Input
            placeholder="ابحث برقم الطلب أو اسم العميل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 pl-10 rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
            >
              <X size={18} />
            </button>
          )}
        </div>
        
        {/* فلاتر */}
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 rounded-xl">
              <SelectValue placeholder="حالة الطلب" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="جديد">جديد</SelectItem>
              <SelectItem value="مكتمل">مكتمل</SelectItem>
              <SelectItem value="ملغي">ملغي</SelectItem>
              <SelectItem value="مرتجع">مرتجع</SelectItem>
              <SelectItem value="مستبدل">مستبدل</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="flex-1 rounded-xl">
              <SelectValue placeholder="حالة الدفع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع حالات الدفع</SelectItem>
              <SelectItem value="مدفوع">مدفوع</SelectItem>
              <SelectItem value="دين">دين</SelectItem>
              <SelectItem value="دفع جزئي">دفع جزئي</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {searchQuery && (
          <p className="text-sm text-text-muted">تم العثور على {filteredOrders.length} طلب</p>
        )}
      </div>

      {/* قائمة الطلبات */}
      {filteredOrders.length === 0 ? (
        <div className="p-12 text-center">
          <ShoppingCart className="mx-auto text-text-muted mb-4" size={48} />
          <p className="text-text-muted text-lg">لا توجد طلبات بعد</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filteredOrders.map((order) => {
            const isLoading = loadingId === order.id

            return (
              <div key={order.id} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* معلومات الطلب */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-text">طلب #{order.order_number}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getOrderStatusColor(order.status)}`}
                      >
                        {order.status}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(order.payment_status)}`}
                      >
                        {order.payment_status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <p className="text-text-muted flex items-center gap-1">
                        <Clock size={16} />
                        {formatDate(order.created_at)}
                      </p>
                      {order.customer_name && (
                        <p className="text-text-muted flex items-center gap-1">
                          <User size={16} />
                          {order.customer_name}
                        </p>
                      )}
                      {order.payment_status !== "مدفوع" && (
                        <p className="text-danger flex items-center gap-1 font-medium">
                          <CreditCard size={16} />
                          متبقي: {formatCurrency(order.remaining_amount)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* الأرقام */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-sm text-text-muted">المبلغ</p>
                      <p className="text-lg font-bold text-text">{formatCurrency(order.total_amount)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-text-muted">التكلفة</p>
                      <p className="text-lg font-bold text-text-muted">{formatCurrency(order.total_cost)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-text-muted">الربح</p>
                      <p className="text-lg font-bold text-success">{formatCurrency(order.total_profit)}</p>
                    </div>
                  </div>

                  {/* الإجراءات */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status dropdown - only show for non-returned/replaced orders */}
                    {order.status !== "مرتجع" && order.status !== "مستبدل" && (
                      <Select
                        value={order.status}
                        onValueChange={(value) => handleStatusChange(order.id, value as Order["status"])}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-32 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="جديد">جديد</SelectItem>
                          <SelectItem value="مكتمل">مكتمل</SelectItem>
                          <SelectItem value="ملغي">ملغي</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    
                    {/* Return/Replace buttons - only for completed orders */}
                    {order.status === "مكتمل" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
                          onClick={() => {
                            setReturnOrder(order)
                            setReturnType("return")
                          }}
                        >
                          <RotateCcw size={16} />
                          إرجاع
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl gap-1 text-purple-600 border-purple-300 hover:bg-purple-50"
                          onClick={() => {
                            setReturnOrder(order)
                            setReturnType("replace")
                          }}
                        >
                          <RefreshCw size={16} />
                          استبدال
                        </Button>
                      </>
                    )}
                    
                    <Button
                      variant="outline"
                      className="rounded-xl gap-2 bg-transparent"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <Eye size={18} />
                      التفاصيل
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* حوار التفاصيل */}
      {selectedOrder && (
        <OrderDetailsDialog order={selectedOrder} open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)} />
      )}

      {/* حوار الإرجاع/الاستبدال */}
      {returnOrder && (
        <ReturnOrderDialog
          order={returnOrder}
          open={!!returnOrder}
          onOpenChange={() => setReturnOrder(null)}
          type={returnType}
        />
      )}
    </div>
  )
}

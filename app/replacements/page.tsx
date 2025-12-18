"use client"

import { useEffect, useState } from "react"
import { RefreshCw, Clock, User, Search, X, CheckCircle, Building2, Warehouse, Package } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Order } from "@/lib/types"
import { formatCurrency, formatDate, getOrderStatusColor } from "@/lib/types"

const handledTypeLabels: Record<string, string> = {
  returned_to_supplier: "تم الإرجاع للمورد",
  kept_in_warehouse: "محفوظ في المخزن",
  replaced_from_supplier: "تم الاستبدال من المورد",
}

export default function ReplacementsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterHandled, setFilterHandled] = useState<string>("all")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    fetchReplacements()
  }, [])

  const fetchReplacements = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("status", "مستبدل")
      .order("returned_at", { ascending: false })
    
    setOrders((data || []) as Order[])
    setLoading(false)
  }

  const handleMarkAsHandled = async (orderId: string, handledType: string) => {
    setUpdatingId(orderId)
    const supabase = createClient()

    const { error } = await supabase
      .from("orders")
      .update({
        return_handled: true,
        return_handled_type: handledType,
        return_handled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)

    if (error) {
      toast.error("حدث خطأ في تحديث الحالة")
    } else {
      toast.success("تم تحديث حالة الاستبدال")
      fetchReplacements()
    }
    setUpdatingId(null)
  }

  const handleUnmarkAsHandled = async (orderId: string) => {
    setUpdatingId(orderId)
    const supabase = createClient()

    const { error } = await supabase
      .from("orders")
      .update({
        return_handled: false,
        return_handled_type: null,
        return_handled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)

    if (error) {
      toast.error("حدث خطأ في تحديث الحالة")
    } else {
      toast.success("تم إلغاء المعالجة")
      fetchReplacements()
    }
    setUpdatingId(null)
  }

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = !searchQuery.trim() || 
      o.order_number.toString().includes(searchQuery) ||
      o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = filterHandled === "all" || 
      (filterHandled === "handled" && o.return_handled) ||
      (filterHandled === "pending" && !o.return_handled)
    
    return matchesSearch && matchesFilter
  })

  const pendingCount = orders.filter(o => !o.return_handled).length
  const handledCount = orders.filter(o => o.return_handled).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-text-muted">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text flex items-center gap-3">
            <RefreshCw className="text-purple-500" />
            المستبدلات
          </h1>
          <p className="text-text-muted mt-1">الطلبات التي تم استبدالها بمنتجات أخرى</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-xl font-bold">
            قيد الانتظار: {pendingCount}
          </div>
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-xl font-bold">
            تمت المعالجة: {handledCount}
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-surface rounded-2xl shadow-sm border border-border p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 max-w-lg">
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
          <Select value={filterHandled} onValueChange={setFilterHandled}>
            <SelectTrigger className="w-48 rounded-xl">
              <SelectValue placeholder="تصفية حسب الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="pending">قيد الانتظار</SelectItem>
              <SelectItem value="handled">تمت المعالجة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Replacements List */}
      <div className="bg-surface rounded-2xl shadow-sm border border-border">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <RefreshCw className="mx-auto text-text-muted mb-4" size={48} />
            <p className="text-text-muted text-lg">لا توجد مستبدلات</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredOrders.map((order) => {
              const isUpdating = updatingId === order.id

              return (
                <div key={order.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-xl font-bold text-text">طلب #{order.order_number}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getOrderStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                          {order.return_handled ? (
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 flex items-center gap-1">
                              <CheckCircle size={14} />
                              {handledTypeLabels[order.return_handled_type || ""] || "تمت المعالجة"}
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                              قيد الانتظار
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <p className="text-text-muted flex items-center gap-1">
                            <Clock size={16} />
                            تاريخ الطلب: {formatDate(order.created_at)}
                          </p>
                          {order.returned_at && (
                            <p className="text-purple-600 flex items-center gap-1">
                              <RefreshCw size={16} />
                              تاريخ الاستبدال: {formatDate(order.returned_at)}
                            </p>
                          )}
                          {order.customer_name && (
                            <p className="text-text-muted flex items-center gap-1">
                              <User size={16} />
                              {order.customer_name}
                            </p>
                          )}
                        </div>
                        {order.return_reason && (
                          <p className="text-sm text-purple-600 mt-2 bg-purple-50 p-2 rounded-lg">
                            سبب الاستبدال: {order.return_reason}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-sm text-text-muted">قيمة الطلب</p>
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
                    </div>

                    {/* Handle Actions */}
                    <div className="flex items-center gap-2 flex-wrap border-t border-border pt-4">
                      {!order.return_handled ? (
                        <>
                          <span className="text-sm text-text-muted ml-2">تحديد كـ:</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 text-purple-600 border-purple-300 hover:bg-purple-50"
                            onClick={() => handleMarkAsHandled(order.id, "replaced_from_supplier")}
                            disabled={isUpdating}
                          >
                            <Package size={16} />
                            تم الاستبدال من المورد
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 text-blue-600 border-blue-300 hover:bg-blue-50"
                            onClick={() => handleMarkAsHandled(order.id, "returned_to_supplier")}
                            disabled={isUpdating}
                          >
                            <Building2 size={16} />
                            تم الإرجاع للمورد
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 text-amber-600 border-amber-300 hover:bg-amber-50"
                            onClick={() => handleMarkAsHandled(order.id, "kept_in_warehouse")}
                            disabled={isUpdating}
                          >
                            <Warehouse size={16} />
                            محفوظ في المخزن
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => handleUnmarkAsHandled(order.id)}
                          disabled={isUpdating}
                        >
                          <X size={16} />
                          إلغاء المعالجة
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredOrders.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6">
          <h3 className="font-bold text-purple-800 mb-4">ملخص المستبدلات</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-purple-600">عدد المستبدلات</p>
              <p className="text-2xl font-bold text-purple-800">{filteredOrders.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-purple-600">إجمالي قيمة المستبدلات</p>
              <p className="text-2xl font-bold text-purple-800">
                {formatCurrency(filteredOrders.reduce((sum, o) => sum + o.total_amount, 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-purple-600">إجمالي التكلفة</p>
              <p className="text-2xl font-bold text-purple-800">
                {formatCurrency(filteredOrders.reduce((sum, o) => sum + o.total_cost, 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-purple-600">ملاحظة</p>
              <p className="text-sm text-purple-700">المستبدلات تحافظ على الأرباح عند الاستبدال</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/sidebar"
import { DebtsContent } from "@/components/debts/debts-content"
import type { Order, PaymentHistory } from "@/lib/types"

export const revalidate = 0
export const dynamic = 'force-dynamic'

export default async function DebtsPage() {
  const supabase = await createClient()

  // جلب الطلبات المدينة أو المدفوعة جزئياً مع تاريخ الدفعات
  const { data: orders } = await supabase
    .from("orders")
    .select(`
      *,
      items:order_items(*)
    `)
    .in("payment_status", ["دين", "دفع جزئي"])
    .order("created_at", { ascending: false })

  // جلب تاريخ جميع الدفعات
  const { data: payments } = await supabase
    .from("payment_history")
    .select("*")
    .order("payment_date", { ascending: false })

  const debtOrders = (orders || []) as Order[]
  const paymentHistory = (payments || []) as PaymentHistory[]

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <main className="flex-1 p-4 lg:p-8 lg:mr-0">
        <div className="max-w-7xl mx-auto pt-16 lg:pt-0">
          <DebtsContent orders={debtOrders} paymentHistory={paymentHistory} />
        </div>
      </main>
    </div>
  )
}

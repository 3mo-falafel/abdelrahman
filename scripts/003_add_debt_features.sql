-- إضافة ميزات الديون والدفعات للطلبات

-- إضافة حقول جديدة لجدول الطلبات
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'مدفوع' CHECK (payment_status IN ('مدفوع', 'دين', 'دفع جزئي')),
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_amount DECIMAL(10, 2) DEFAULT 0;

-- تحديث السجلات الموجودة
UPDATE orders 
SET payment_status = 'مدفوع',
    paid_amount = total_amount,
    remaining_amount = 0
WHERE payment_status IS NULL;

-- جدول تاريخ الدفعات
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_amount DECIMAL(10, 2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إضافة حقل السعر المخصص لعناصر الطلب
ALTER TABLE order_items 
  ADD COLUMN IF NOT EXISTS custom_price DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON orders(customer_name);
CREATE INDEX IF NOT EXISTS idx_payment_history_order_id ON payment_history(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_date ON payment_history(payment_date);

-- تمكين RLS
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to payment_history" ON payment_history FOR ALL USING (true) WITH CHECK (true);

-- دالة لتحديث حالة الدفع تلقائياً
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- حساب المبلغ المتبقي
  NEW.remaining_amount := NEW.total_amount - NEW.paid_amount;
  
  -- تحديث حالة الدفع
  IF NEW.remaining_amount = 0 THEN
    NEW.payment_status := 'مدفوع';
  ELSIF NEW.paid_amount = 0 THEN
    NEW.payment_status := 'دين';
  ELSE
    NEW.payment_status := 'دفع جزئي';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المشغل
DROP TRIGGER IF EXISTS trigger_update_payment_status ON orders;
CREATE TRIGGER trigger_update_payment_status
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_status();

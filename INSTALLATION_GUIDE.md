# 🔧 دليل التثبيت - نظام الديون

## الخطوة 1: تحديث قاعدة البيانات

### افتح Supabase SQL Editor وقم بتشغيل هذا السكريبت:

يمكنك نسخ السكريبت من ملف: `scripts/003_add_debt_features.sql`

أو تشغيله مباشرة من هنا:

```sql
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
```

---

## الخطوة 2: التأكد من نجاح التثبيت

قم بتشغيل هذا الاستعلام للتحقق:

```sql
-- التحقق من الجداول والحقول الجديدة
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name IN ('customer_name', 'payment_status', 'paid_amount', 'remaining_amount');

-- التحقق من جدول payment_history
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'payment_history'
);

-- التحقق من حقول order_items الجديدة
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'order_items' 
  AND column_name IN ('custom_price', 'discount_amount');
```

إذا ظهرت النتائج بنجاح، فأنت جاهز! ✅

---

## الخطوة 3: إعادة تشغيل التطبيق

```bash
# إيقاف التطبيق (إذا كان يعمل)
# اضغط Ctrl+C في Terminal

# تشغيل التطبيق من جديد
pnpm dev
# أو
npm run dev
```

---

## ✅ الآن يمكنك:

1. إنشاء طلبات بديون ✨
2. تعديل الأسعار المخصصة 💰
3. إضافة دفعات جزئية 💳
4. تتبع جميع الديون 📊
5. عرض تاريخ الدفعات 📅

---

## 🆘 إذا واجهت مشاكل:

### مشكلة: "column already exists"
```sql
-- استخدم DROP للحذف ثم أعد التشغيل
ALTER TABLE orders DROP COLUMN IF EXISTS customer_name;
-- ثم أعد تشغيل السكريبت الكامل
```

### مشكلة: "relation already exists"
```sql
-- احذف الجدول وأعد إنشائه
DROP TABLE IF EXISTS payment_history CASCADE;
-- ثم أعد تشغيل السكريبت الكامل
```

### مشكلة: "function already exists"
```sql
-- احذف الدالة والمشغل
DROP TRIGGER IF EXISTS trigger_update_payment_status ON orders;
DROP FUNCTION IF EXISTS update_payment_status();
-- ثم أعد تشغيل السكريبت الكامل
```

---

## 📞 للدعم

إذا استمرت المشاكل، يمكنك:
1. حذف قاعدة البيانات بالكامل وإعادة إنشائها
2. تشغيل السكريبتات بالترتيب:
   - `001_create_tables.sql`
   - `002_create_monthly_reports.sql`
   - `003_add_debt_features.sql`

---

**بالتوفيق! 🚀**

-- Add return/replacement fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_handled BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_handled_type TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS return_handled_at TIMESTAMP WITH TIME ZONE;

-- Update status check constraint to include new statuses
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('جديد', 'مكتمل', 'ملغي', 'مرتجع', 'مستبدل'));

-- Add constraint for return handled type
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_return_handled_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_return_handled_type_check 
  CHECK (return_handled_type IS NULL OR return_handled_type IN ('returned_to_supplier', 'kept_in_warehouse', 'replaced_from_supplier'));

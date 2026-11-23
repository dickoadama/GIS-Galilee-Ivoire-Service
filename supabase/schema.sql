-- GIS (Galilée Ivoire Service) — Schéma PostgreSQL pour Supabase
-- Exécuter ce script dans Supabase > SQL Editor :
-- https://supabase.com/dashboard/project/eftwgbmvgdhvrfbabwtw/sql/new

CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'client',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.members (
  id TEXT PRIMARY KEY,
  uid TEXT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  assigned_by_uid TEXT NOT NULL,
  staff_viewer_uids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_settings (
  id TEXT PRIMARY KEY,
  brand_acronym TEXT NOT NULL,
  company_name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  location TEXT NOT NULL,
  closing_slogan TEXT NOT NULL,
  phones JSONB NOT NULL,
  hardware JSONB NOT NULL,
  beverages JSONB NOT NULL,
  commitments JSONB NOT NULL,
  theme TEXT NOT NULL DEFAULT 'light',
  default_model TEXT NOT NULL DEFAULT 'editorial',
  default_format TEXT NOT NULL DEFAULT 'landscape',
  currency_label TEXT NOT NULL DEFAULT 'FCFA',
  delivery_fee_fcfa INTEGER NOT NULL DEFAULT 2000,
  free_delivery_threshold_fcfa INTEGER NOT NULL DEFAULT 50000,
  hours_weekdays TEXT NOT NULL,
  hours_saturday TEXT NOT NULL,
  hours_sunday TEXT NOT NULL,
  whatsapp_phone TEXT NOT NULL,
  email TEXT NOT NULL,
  accepted_payments JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  barcode TEXT NOT NULL DEFAULT '',
  pole TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  unit_label TEXT NOT NULL,
  price_fcfa INTEGER NOT NULL DEFAULT 0,
  wholesale_price_fcfa INTEGER NOT NULL DEFAULT 0,
  wholesale_min_qty INTEGER NOT NULL DEFAULT 10,
  purchase_cost_fcfa INTEGER NOT NULL DEFAULT 0,
  target_margin_pct DOUBLE PRECISION NOT NULL DEFAULT 18,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  critical_stock_threshold INTEGER NOT NULL DEFAULT 15,
  priority_score INTEGER NOT NULL DEFAULT 50,
  order_count INTEGER NOT NULL DEFAULT 0,
  outflow_qty INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY,
  doc_type TEXT NOT NULL,
  code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL DEFAULT '',
  customer_address TEXT NOT NULL DEFAULT '',
  delivery_mode TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  discount_fcfa INTEGER NOT NULL DEFAULT 0,
  delivery_fee_fcfa INTEGER NOT NULL DEFAULT 0,
  ciment_quincaillerie_subtotal INTEGER NOT NULL DEFAULT 0,
  boissons_subtotal INTEGER NOT NULL DEFAULT 0,
  total_fcfa INTEGER NOT NULL DEFAULT 0,
  created_by_uid TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  assigned_loader_name TEXT NOT NULL DEFAULT '',
  assigned_driver_name TEXT NOT NULL DEFAULT '',
  staff_reader_uids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  pole TEXT NOT NULL,
  name TEXT NOT NULL,
  unit_label TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  applied_unit_price INTEGER NOT NULL,
  is_wholesale BOOLEAN NOT NULL DEFAULT false,
  line_total INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  pole_scope TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  supplier_phone TEXT NOT NULL DEFAULT '',
  supplier_address TEXT NOT NULL DEFAULT '',
  expected_delivery_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  total_estimated_fcfa INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_by_uid TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  staff_reader_uids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  pole TEXT NOT NULL,
  name TEXT NOT NULL,
  unit_label TEXT NOT NULL,
  current_stock_at_order INTEGER NOT NULL DEFAULT 0,
  critical_threshold INTEGER NOT NULL DEFAULT 15,
  quantity INTEGER NOT NULL,
  estimated_unit_cost_fcfa INTEGER NOT NULL DEFAULT 0,
  line_total_fcfa INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  is_team_channel BOOLEAN NOT NULL DEFAULT false,
  participant_uids JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_message_text TEXT NOT NULL DEFAULT '',
  last_sender_name TEXT NOT NULL DEFAULT '',
  created_by_uid TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_uid TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  text TEXT NOT NULL,
  participant_uids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  actor_uid TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sécurité RLS : lecture publique du catalogue & des paramètres uniquement.
-- Les écritures serveur utilisent SUPABASE_SECRET_KEY (qui contourne RLS côté backend sécurisé).
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read products" ON public.products;
CREATE POLICY "Public read products" ON public.products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read store_settings" ON public.store_settings;
CREATE POLICY "Public read store_settings" ON public.store_settings
  FOR SELECT USING (true);

-- Droits d'accès PostgreSQL pour les rôles Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.products, public.store_settings TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;


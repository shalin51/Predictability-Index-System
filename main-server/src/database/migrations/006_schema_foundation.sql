-- Migration 006: Reference library foundation

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'record_status') THEN
    CREATE TYPE record_status AS ENUM ('active', 'inactive', 'archived');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_key VARCHAR(50) UNIQUE NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES app_users(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES app_users(id),
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  action VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE materials
  ADD COLUMN IF NOT EXISTS material_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS material_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS default_unit VARCHAR(50) DEFAULT 'wt%',
  ADD COLUMN IF NOT EXISTS status record_status NOT NULL DEFAULT 'active';

UPDATE materials
SET
  material_code = COALESCE(material_code, regexp_replace(upper(name), '[^A-Z0-9]+', '_', 'g')),
  material_name = COALESCE(material_name, name),
  default_unit = COALESCE(default_unit, unit, 'wt%')
WHERE material_code IS NULL OR material_name IS NULL OR default_unit IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_material_code_unique
  ON materials(material_code)
  WHERE material_code IS NOT NULL;

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS supplier_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS contact_info TEXT,
  ADD COLUMN IF NOT EXISTS status record_status NOT NULL DEFAULT 'active';

UPDATE suppliers
SET
  supplier_name = COALESCE(supplier_name, name),
  contact_info = COALESCE(contact_info, contact_email)
WHERE supplier_name IS NULL OR contact_info IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_supplier_name_unique
  ON suppliers(supplier_name)
  WHERE supplier_name IS NOT NULL;

CREATE TABLE IF NOT EXISTS supplier_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  material_id UUID NOT NULL REFERENCES materials(id),
  supplier_material_code VARCHAR(100),
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, material_id, supplier_material_code)
);

CREATE TABLE IF NOT EXISTS material_lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_material_id UUID NOT NULL REFERENCES supplier_materials(id),
  lot_number VARCHAR(150) NOT NULL,
  received_date DATE,
  expiration_date DATE,
  status record_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (supplier_material_id, lot_number)
);

CREATE TABLE IF NOT EXISTS machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_code VARCHAR(100) UNIQUE NOT NULL,
  machine_name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS molds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mold_code VARCHAR(100) UNIQUE NOT NULL,
  mold_name VARCHAR(255),
  mold_type VARCHAR(100),
  cavity_count INT,
  status record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'roles',
    'app_users',
    'supplier_materials',
    'material_lots',
    'machines',
    'molds'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = format('trg_%s_updated_at', tbl)
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        tbl,
        tbl
      );
    END IF;
  END LOOP;
END;
$$;

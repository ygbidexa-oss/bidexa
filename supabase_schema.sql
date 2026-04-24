-- =====================================================
-- BIDEXA SUPABASE SCHEMA
-- Execute this in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: entreprises (tenants/organizations)
-- =====================================================
CREATE TABLE IF NOT EXISTS entreprises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  logo_url TEXT,
  adresse TEXT,
  ville TEXT,
  province TEXT DEFAULT 'QC',
  code_postal TEXT,
  telephone TEXT,
  email TEXT,
  site_web TEXT,
  permis_rbq TEXT,
  neq TEXT,
  no_tps TEXT,
  no_tvq TEXT,
  politique TEXT,
  couleur_primaire TEXT DEFAULT '#C9A84C',
  -- Subscription fields
  forfait TEXT NOT NULL DEFAULT 'starter' CHECK (forfait IN ('starter', 'pro', 'enterprise')),
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'suspendu', 'annulé')),
  date_debut DATE NOT NULL DEFAULT CURRENT_DATE,
  date_renouvellement DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
  mrr NUMERIC(10,2) DEFAULT 0,
  ia_extra INTEGER DEFAULT 0,
  modules TEXT[] DEFAULT ARRAY['clients', 'estimation', 'soumissions', 'documents'],
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entreprises_email ON entreprises(email);
CREATE INDEX IF NOT EXISTS idx_entreprises_statut ON entreprises(statut);
CREATE INDEX IF NOT EXISTS idx_entreprises_forfait ON entreprises(forfait);

-- =====================================================
-- TABLE: profiles (users)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'estimateur' CHECK (role IN ('admin', 'super_admin', 'billing_admin', 'directeur', 'estimateur', 'chef_projet', 'comptable', 'acheteur')),
  entreprise_id UUID REFERENCES entreprises(id) ON DELETE SET NULL,
  modules TEXT[] DEFAULT ARRAY[]::TEXT[],
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_entreprise ON profiles(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- =====================================================
-- TABLE: abonnements_config (subscription plans)
-- =====================================================
CREATE TABLE IF NOT EXISTS abonnements_config (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  "desc" TEXT,
  prix NUMERIC(10,2),
  ia_jour INTEGER NOT NULL DEFAULT 10,
  ia_mois INTEGER NOT NULL DEFAULT 300,
  max_utilisateurs INTEGER,
  modules TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  features TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  highlighted BOOLEAN DEFAULT FALSE,
  cta TEXT DEFAULT 'Choisir',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: factures (invoices)
-- =====================================================
CREATE TABLE IF NOT EXISTS factures (
  id TEXT PRIMARY KEY,
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  montant NUMERIC(10,2) NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('payée', 'en_attente', 'en_retard')),
  periode TEXT NOT NULL,
  date_echeance DATE NOT NULL,
  rappels JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_factures_entreprise ON factures(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_factures_statut ON factures(statut);
CREATE INDEX IF NOT EXISTS idx_factures_date ON factures(date);

-- =====================================================
-- TABLE: usage_ia (AI usage tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS usage_ia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  daily INTEGER DEFAULT 0,
  monthly INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entreprise_id, date)
);

CREATE INDEX IF NOT EXISTS idx_usage_ia_entreprise ON usage_ia(entreprise_id);
CREATE INDEX IF NOT EXISTS idx_usage_ia_date ON usage_ia(date);

-- =====================================================
-- SEED: Default subscription plans
-- =====================================================
INSERT INTO abonnements_config (id, nom, "desc", prix, ia_jour, ia_mois, max_utilisateurs, modules, features, highlighted, cta)
VALUES 
  ('starter', 'Starter', 'Parfait pour démarrer', 49, 10, 300, 3, 
   ARRAY['clients', 'estimation', 'soumissions', 'documents'],
   ARRAY['Jusqu''à 3 utilisateurs', '10 requêtes IA/jour', 'Support email'], FALSE, 'Commencer'),
  
  ('pro', 'Pro', 'Pour les équipes en croissance', 149, 50, 1500, 10,
   ARRAY['clients', 'estimation', 'soumissions', 'concurrence', 'projets', 'bons-commande', 'fournisseurs', 'comptabilite', 'documents', 'reporting'],
   ARRAY['Jusqu''à 10 utilisateurs', '50 requêtes IA/jour', 'Support prioritaire', 'API access'], TRUE, 'Recommandé'),
  
  ('enterprise', 'Enterprise', 'Solution complète', NULL, 200, 6000, NULL,
   ARRAY['clients', 'estimation', 'soumissions', 'concurrence', 'projets', 'bons-commande', 'fournisseurs', 'comptabilite', 'documents', 'reporting', 'ia'],
   ARRAY['Utilisateurs illimités', '200 requêtes IA/jour', 'Support dédié 24/7', 'Personnalisation avancée'], FALSE, 'Contacter ventes')
ON CONFLICT (id) DO UPDATE SET
  nom = EXCLUDED.nom,
  "desc" = EXCLUDED."desc",
  prix = EXCLUDED.prix,
  ia_jour = EXCLUDED.ia_jour,
  ia_mois = EXCLUDED.ia_mois,
  max_utilisateurs = EXCLUDED.max_utilisateurs,
  modules = EXCLUDED.modules,
  features = EXCLUDED.features,
  highlighted = EXCLUDED.highlighted,
  cta = EXCLUDED.cta,
  updated_at = NOW();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE entreprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonnements_config ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own entreprise (FIXED - no recursion)
CREATE POLICY "Users can view their own entreprise" ON entreprises
  FOR SELECT USING (
    id = (SELECT entreprise_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('super_admin', 'billing_admin')
    )
  );

-- Policy: Admins can update their entreprise
CREATE POLICY "Admins can update their entreprise" ON entreprises
  FOR UPDATE USING (
    id IN (SELECT entreprise_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'billing_admin'))
  );

-- Policy: Super admins can insert entreprises
CREATE POLICY "Super admins can insert entreprises" ON entreprises
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'billing_admin'))
  );

-- Policy: Users can view profiles in their entreprise (FIXED - no recursion)
CREATE POLICY "Users can view profiles in their entreprise" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('super_admin', 'billing_admin')
    )
    OR (
      entreprise_id IS NOT NULL 
      AND entreprise_id = (
        SELECT entreprise_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Policy: Admins can insert profiles in their entreprise
CREATE POLICY "Admins can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Policy: Users can view factures of their entreprise
CREATE POLICY "Users can view factures of their entreprise" ON factures
  FOR SELECT USING (
    entreprise_id IN (SELECT entreprise_id FROM profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'billing_admin'))
  );

-- Policy: Users can view usage of their entreprise
CREATE POLICY "Users can view usage of their entreprise" ON usage_ia
  FOR SELECT USING (
    entreprise_id IN (SELECT entreprise_id FROM profiles WHERE id = auth.uid())
  );

-- Policy: Anyone can view forfaits (public read)
CREATE POLICY "Anyone can view forfaits" ON abonnements_config 
  FOR SELECT USING (true);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function: Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_entreprises_updated_at 
  BEFORE UPDATE ON entreprises
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function: Create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, prenom, nom, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create profile after auth user created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STORAGE BUCKET SETUP (for logos and documents)
-- =====================================================

-- Create storage buckets (run these in Storage section or via SQL if enabled)
-- Note: These are typically created via the UI or Storage API

/*
-- For logos bucket:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- For documents bucket:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage
CREATE POLICY "Public logos are viewable by everyone" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');

CREATE POLICY "Authenticated users can upload logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'logos' 
    AND auth.role() = 'authenticated'
  );
*/

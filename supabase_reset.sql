-- =====================================================
-- BIDEXA SUPABASE - RESET COMPLET
-- Exécutez ce script pour tout effacer et recommencer
-- =====================================================

-- =====================================================
-- ÉTAPE 1: Supprimer toutes les policies existantes
-- =====================================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users in same entreprise can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own entreprise" ON entreprises;
DROP POLICY IF EXISTS "Admins can update their entreprise" ON entreprises;
DROP POLICY IF EXISTS "Super admins can insert entreprises" ON entreprises;
DROP POLICY IF EXISTS "Users can view factures of their entreprise" ON factures;
DROP POLICY IF EXISTS "Users can view usage of their entreprise" ON usage_ia;
DROP POLICY IF EXISTS "Anyone can view forfaits" ON abonnements_config;

-- =====================================================
-- ÉTAPE 2: Supprimer les triggers
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_entreprises_updated_at ON entreprises;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- =====================================================
-- ÉTAPE 3: Supprimer les tables (données incluses)
-- =====================================================
DROP TABLE IF EXISTS usage_ia CASCADE;
DROP TABLE IF EXISTS factures CASCADE;
DROP TABLE IF EXISTS abonnements_config CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS entreprises CASCADE;

-- =====================================================
-- ÉTAPE 4: Supprimer les utilisateurs auth (optionnel)
-- =====================================================
-- ATTENTION: Cela déconnectera tous les utilisateurs
-- DELETE FROM auth.users WHERE email = 'ygbidexa@gmail.com';

-- =====================================================
-- ÉTAPE 5: Recréer les tables
-- =====================================================

-- Table entreprises
CREATE TABLE entreprises (
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
  forfait TEXT NOT NULL DEFAULT 'starter' CHECK (forfait IN ('starter', 'pro', 'enterprise')),
  statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'suspendu', 'annulé')),
  date_debut DATE NOT NULL DEFAULT CURRENT_DATE,
  date_renouvellement DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 month'),
  mrr NUMERIC(10,2) DEFAULT 0,
  ia_extra INTEGER DEFAULT 0,
  modules TEXT[] DEFAULT ARRAY['clients', 'estimation', 'soumissions', 'documents'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table profiles
CREATE TABLE profiles (
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

-- Table abonnements_config
CREATE TABLE abonnements_config (
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

-- Table factures
CREATE TABLE factures (
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

-- Table usage_ia
CREATE TABLE usage_ia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  daily INTEGER DEFAULT 0,
  monthly INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entreprise_id, date)
);

-- =====================================================
-- ÉTAPE 6: Insérer les forfaits par défaut
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
   ARRAY['Utilisateurs illimités', '200 requêtes IA/jour', 'Support dédié 24/7', 'Personnalisation avancée'], FALSE, 'Contacter ventes');

-- =====================================================
-- ÉTAPE 7: Activer RLS et créer des policies SIMPLES
-- =====================================================

ALTER TABLE entreprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_ia ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonnements_config ENABLE ROW LEVEL SECURITY;

-- Policy SIMPLE: chacun voit son propre profil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Policy: forfaits en lecture publique
CREATE POLICY "Anyone can view forfaits" ON abonnements_config 
  FOR SELECT USING (true);

-- Policy: entreprises - simple
CREATE POLICY "Users can view entreprises" ON entreprises
  FOR SELECT USING (true);

CREATE POLICY "Users can update entreprises" ON entreprises
  FOR UPDATE USING (true);

-- Policy: factures - simple
CREATE POLICY "Users can view factures" ON factures
  FOR SELECT USING (true);

-- Policy: usage_ia - simple
CREATE POLICY "Users can view usage" ON usage_ia
  FOR SELECT USING (true);

-- =====================================================
-- ÉTAPE 8: Créer le trigger pour créer le profil automatiquement
-- =====================================================
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- ÉTAPE 9: Créer le super admin manuellement
-- =====================================================
-- À exécuter APRÈS avoir créé l'utilisateur dans Auth
-- ou utilisez l'interface Supabase pour créer l'utilisateur

-- Exemple: après création de l'utilisateur ygbidexa@gmail.com dans Auth,
-- exécutez ce SQL pour mettre à jour son profil:
/*
UPDATE profiles 
SET role = 'super_admin',
    prenom = 'Super',
    nom = 'Admin'
WHERE email = 'ygbidexa@gmail.com';
*/

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================

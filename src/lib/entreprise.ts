const STORAGE_KEY = 'bidexa_entreprise'

export interface EntrepriseProfile {
  nom: string
  slogan: string
  logo: string
  adresse: string
  ville: string
  province: string
  codePostal: string
  telephone: string
  email: string
  siteWeb: string
  permisRBQ: string
  neq: string
  noTPS: string
  noTVQ: string
  tauxTPS: number        // ex: 5 pour 5%
  tauxTVQ: number        // ex: 9.975 pour 9.975%
  taxesActivees: boolean // false = pas de taxes sur les factures
  politique: string
  couleurPrimaire: string
  updatedAt: string
}

const DEFAULT_PROFILE: EntrepriseProfile = {
  nom: 'Mon Entreprise de Construction',
  slogan: '',
  logo: '',
  adresse: '',
  ville: '',
  province: 'QC',
  codePostal: '',
  telephone: '',
  email: '',
  siteWeb: '',
  permisRBQ: '',
  neq: '',
  noTPS: '',
  noTVQ: '',
  tauxTPS: 5,
  tauxTVQ: 9.975,
  taxesActivees: true,
  politique: '',
  couleurPrimaire: '#C9A84C',
  updatedAt: new Date().toISOString(),
}

export function getEntreprise(): EntrepriseProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as EntrepriseProfile
  } catch {
    return null
  }
}

export function saveEntreprise(data: EntrepriseProfile): void {
  if (typeof window === 'undefined') return
  const updated = { ...data, updatedAt: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function initEntreprise(nomEntreprise: string, overrides?: Partial<EntrepriseProfile>): EntrepriseProfile {
  const profile: EntrepriseProfile = {
    ...DEFAULT_PROFILE,
    nom: nomEntreprise,
    ...overrides,
    updatedAt: new Date().toISOString(),
  }
  saveEntreprise(profile)
  return profile
}

export function ensureDefaultEntreprise(): void {
  if (typeof window === 'undefined') return
  if (!localStorage.getItem(STORAGE_KEY)) {
    initEntreprise('Bidexa Construction Inc.', {
      adresse: '1250 boul. Lebourgneuf, bureau 400',
      ville: 'Québec',
      province: 'QC',
      codePostal: 'G2K 2G4',
      telephone: '418-555-0200',
      email: 'soumissions@bidexa.ca',
      siteWeb: 'www.bidexa.ca',
      permisRBQ: 'RBQ 8365-7821-01',
      neq: '2265432189',
      noTPS: '123456789 RT0001',
      noTVQ: '1234567890 TQ0001',
      tauxTPS: 5,
      tauxTVQ: 9.975,
      taxesActivees: true,
      slogan: 'L\'excellence en construction, de la soumission au projet',
      couleurPrimaire: '#C9A84C',
    })
  }
}

/** Retourne les taux de taxes actifs. Fallback sur les valeurs canadiennes si profil absent. */
export function getTaxes(): { tauxTPS: number; tauxTVQ: number; taxesActivees: boolean; noTPS: string; noTVQ: string } {
  const p = getEntreprise()
  return {
    tauxTPS:       p?.tauxTPS       ?? 5,
    tauxTVQ:       p?.tauxTVQ       ?? 9.975,
    taxesActivees: p?.taxesActivees ?? true,
    noTPS:         p?.noTPS         ?? '',
    noTVQ:         p?.noTVQ         ?? '',
  }
}

/** Calcule TPS et TVQ sur un montant HT selon les réglages entreprise */
export function calculerTaxes(montantHT: number): { tps: number; tvq: number; total: number } {
  const { tauxTPS, tauxTVQ, taxesActivees } = getTaxes()
  if (!taxesActivees) return { tps: 0, tvq: 0, total: montantHT }
  const tps = +(montantHT * tauxTPS / 100).toFixed(2)
  const tvq = +(montantHT * tauxTVQ / 100).toFixed(2)
  return { tps, tvq, total: montantHT + tps + tvq }
}

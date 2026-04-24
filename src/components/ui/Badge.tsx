import clsx from 'clsx'

const variants = {
  gagnee: 'bg-emerald-100 text-emerald-700',
  gagne: 'bg-emerald-100 text-emerald-700',
  perdue: 'bg-red-100 text-red-700',
  perdu: 'bg-red-100 text-red-700',
  en_cours: 'bg-blue-100 text-blue-700',
  en_preparation: 'bg-amber-100 text-amber-700',
  en_validation: 'bg-purple-100 text-purple-700',
  deposee: 'bg-cyan-100 text-cyan-700',
  brouillon: 'bg-slate-100 text-slate-600',
  annulee: 'bg-slate-100 text-slate-400',
  planification: 'bg-indigo-100 text-indigo-700',
  suspendu: 'bg-orange-100 text-orange-700',
  termine: 'bg-emerald-100 text-emerald-700',
  approuve: 'bg-emerald-100 text-emerald-700',
  envoye: 'bg-cyan-100 text-cyan-700',
  recu: 'bg-blue-100 text-blue-700',
  ferme: 'bg-slate-100 text-slate-600',
  payee: 'bg-emerald-100 text-emerald-700',
  envoyee: 'bg-cyan-100 text-cyan-700',
  partiellement_payee: 'bg-amber-100 text-amber-700',
  en_retard: 'bg-red-100 text-red-700',
  public: 'bg-blue-100 text-blue-700',
  prive: 'bg-purple-100 text-purple-700',
  a_faire: 'bg-slate-100 text-slate-600',
  en_attente: 'bg-amber-100 text-amber-700',
  refuse: 'bg-red-100 text-red-700',
  valide: 'bg-emerald-100 text-emerald-700',
  annule: 'bg-red-100 text-red-700',
  soumis: 'bg-amber-100 text-amber-700',
  rejete: 'bg-red-100 text-red-700',
  paye: 'bg-emerald-100 text-emerald-700',
  manuel: 'bg-slate-100 text-slate-600',
  actif: 'bg-emerald-100 text-emerald-700',
  inactif: 'bg-slate-100 text-slate-400',
  niveau1: 'bg-yellow-100 text-yellow-700',
  niveau2: 'bg-orange-100 text-orange-700',
  niveau3: 'bg-red-100 text-red-700',
}

const labels: Record<string, string> = {
  gagnee: 'Gagnée', gagne: 'Gagné', perdue: 'Perdue', perdu: 'Perdu',
  en_cours: 'En cours', en_preparation: 'En préparation', en_validation: 'En validation',
  deposee: 'Déposée', brouillon: 'Brouillon', annulee: 'Annulée',
  planification: 'Planification', suspendu: 'Suspendu', termine: 'Terminé',
  approuve: 'Approuvé', envoye: 'Envoyé', recu: 'Reçu', ferme: 'Fermé',
  payee: 'Payée', envoyee: 'Envoyée', partiellement_payee: 'Part. payée', en_retard: 'En retard',
  public: 'Public', prive: 'Privé',
  a_faire: 'À faire', en_attente: 'En attente', refuse: 'Refusé',
  valide: 'Validé', annule: 'Annulé', soumis: 'Soumis', rejete: 'Rejeté', paye: 'Payé',
  manuel: 'Manuel', actif: 'Actif', inactif: 'Inactif',
  niveau1: 'Chef dept.', niveau2: 'Directeur', niveau3: 'DG',
}

interface BadgeProps {
  status: string
  className?: string
}

export function Badge({ status, className }: BadgeProps) {
  const cls = variants[status as keyof typeof variants] ?? 'bg-slate-100 text-slate-600'
  const label = labels[status] ?? status
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', cls, className)}>
      {label}
    </span>
  )
}

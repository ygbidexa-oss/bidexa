'use client'
import { soumissions } from '@/lib/mock-data/soumissions'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

const statusColors: Record<string, string> = {
  gagnee: '#10b981',
  deposee: '#06b6d4',
  en_preparation: '#f59e0b',
  en_validation: '#8b5cf6',
  brouillon: '#94a3b8',
  perdue: '#ef4444',
  annulee: '#d1d5db',
}

export function PipelineChart() {
  const grouped: Record<string, number> = {}
  soumissions.forEach(s => {
    grouped[s.statut] = (grouped[s.statut] || 0) + 1
  })

  const data = Object.entries(grouped).map(([statut, count]) => ({
    name: {
      gagnee: 'Gagnée', deposee: 'Déposée', en_preparation: 'En prép.',
      en_validation: 'Validation', brouillon: 'Brouillon', perdue: 'Perdue', annulee: 'Annulée'
    }[statut] ?? statut,
    Nombre: count,
    fill: statusColors[statut] ?? '#94a3b8',
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
        <Bar dataKey="Nombre" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

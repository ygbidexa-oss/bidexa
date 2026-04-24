'use client'
import { cashflow } from '@/lib/mock-data/comptabilite'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function CashflowChart() {
  const data = cashflow.map(l => ({
    mois: l.mois.split(' ')[0],
    Entrées: Math.round(l.entrees / 1000),
    Sorties: Math.round(l.sorties / 1000),
    Solde: Math.round(l.soldeCumulatif / 1000),
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="colorEntrees" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorSorties" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
          formatter={(v: number) => [`${v} k$`]}
        />
        <Area type="monotone" dataKey="Entrées" stroke="#10b981" strokeWidth={2} fill="url(#colorEntrees)" />
        <Area type="monotone" dataKey="Sorties" stroke="#ef4444" strokeWidth={2} fill="url(#colorSorties)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

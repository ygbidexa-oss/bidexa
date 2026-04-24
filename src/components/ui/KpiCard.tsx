import { ReactNode } from 'react'
import { Card } from './Card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import clsx from 'clsx'

interface KpiCardProps {
  label: string
  value: string
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  icon?: ReactNode
  accent?: boolean
}

export function KpiCard({ label, value, sub, trend, trendLabel, icon, accent }: KpiCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-400'

  return (
    <Card className={clsx('flex flex-col gap-3', accent && 'border-amber-200 bg-amber-50/30')}>
      <div className="flex items-start justify-between">
        <span className="text-sm text-slate-500 font-medium">{label}</span>
        {icon && (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: accent ? 'rgba(201,168,76,0.15)' : '#f1f5f9' }}>
            {icon}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {trend && trendLabel && (
        <div className={clsx('flex items-center gap-1.5 text-xs font-medium', trendColor)}>
          <TrendIcon size={13} />
          {trendLabel}
        </div>
      )}
    </Card>
  )
}

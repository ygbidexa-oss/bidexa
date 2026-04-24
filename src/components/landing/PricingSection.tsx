'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle, XCircle, Bot } from 'lucide-react'
import { getForfaitsConfig, ForfaitConfig, ALL_MODULES_LABELS, ALL_MODULES_LIST } from '@/lib/subscriptions-store'

export function PricingSection() {
  const [plans, setPlans] = useState<ForfaitConfig[]>([])

  useEffect(() => {
    setPlans(getForfaitsConfig())
    function onStorage(e: StorageEvent) {
      if (e.key === 'bidexa_forfaits_config') setPlans(getForfaitsConfig())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  if (plans.length === 0) return null

  return (
    <section id="pricing" className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-2" style={{ color: '#0D1B2A' }}>
          Tarifs transparents
        </h2>
        <p className="text-center text-slate-500 mb-12 text-sm">
          Sans engagement. Changez de forfait à tout moment.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(p => (
            <div
              key={p.id}
              className={`relative rounded-2xl p-8 border-2 flex flex-col ${
                p.highlighted ? 'border-amber-400 shadow-xl shadow-amber-100' : 'border-slate-200'
              }`}
            >
              {p.highlighted && (
                <div
                  className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
                  style={{ background: '#C9A84C' }}
                >
                  Recommandé
                </div>
              )}

              <div className="mb-4">
                <h3 className="font-bold text-lg mb-1" style={{ color: '#0D1B2A' }}>{p.nom}</h3>
                <p className="text-xs text-slate-400">{p.desc}</p>
              </div>

              <div className="mb-5">
                {p.prix ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold" style={{ color: p.highlighted ? '#C9A84C' : '#0D1B2A' }}>
                      {p.prix} $
                    </span>
                    <span className="text-slate-400 text-sm">/mois</span>
                  </div>
                ) : (
                  <div className="text-2xl font-extrabold" style={{ color: '#0D1B2A' }}>Sur devis</div>
                )}
              </div>

              {/* Quota IA */}
              <div className="mb-5 px-3 py-2 rounded-xl flex items-center gap-2 border" style={{ borderColor: '#C9A84C33', background: '#fef9ec' }}>
                <Bot size={13} style={{ color: '#C9A84C' }} />
                <span className="text-xs font-semibold" style={{ color: '#b8830a' }}>
                  IA : {p.iaJour} req/jour · {p.iaMois.toLocaleString('fr-CA')}/mois
                </span>
              </div>

              {/* Fonctionnalités */}
              <ul className="space-y-2 mb-5 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />{f}
                  </li>
                ))}
              </ul>

              {/* Modules inclus */}
              {p.modules && p.modules.length > 0 && (
                <div className="mb-6 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Modules inclus</p>
                  <div className="grid grid-cols-2 gap-1">
                    {ALL_MODULES_LIST.map(mod => {
                      const included = p.modules.includes(mod)
                      return (
                        <div key={mod} className={`flex items-center gap-1.5 text-xs py-0.5 ${included ? 'text-slate-700' : 'text-slate-300'}`}>
                          {included
                            ? <CheckCircle size={11} className="text-emerald-500 shrink-0" />
                            : <XCircle size={11} className="text-slate-300 shrink-0" />
                          }
                          {ALL_MODULES_LABELS[mod]}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <Link
                href="/register"
                className={`text-center py-3 rounded-xl font-semibold text-sm transition ${
                  p.highlighted
                    ? 'text-white hover:opacity-90'
                    : 'border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
                style={p.highlighted ? { background: '#C9A84C' } : {}}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

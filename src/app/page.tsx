import Link from 'next/link'
import {
  ChevronRight, Star, Zap,
  ArrowRight, ShieldCheck, Lock, Bot, BookOpen,
} from 'lucide-react'
import { ModulesSection } from '@/components/landing/ModulesSection'
import { PricingSection } from '@/components/landing/PricingSection'

// ── Données ────────────────────────────────────────────────────────────────────

const PIPELINE = [
  { label: 'Opportunité', color: '#C9A84C' },
  { label: 'Estimation',  color: '#b8956e' },
  { label: 'Soumission',  color: '#a07a5c' },
  { label: 'Projet',      color: '#0D1B2A' },
  { label: 'Achats',      color: '#1a2d42' },
  { label: 'Facturation', color: '#243d58' },
]

const TESTIMONIALS = [
  {
    name: 'Marc Tremblay',
    role: 'Directeur général, Construction GT',
    quote: 'Bidexa a transformé notre façon de gérer les soumissions. Notre taux de succès a augmenté de 22% en 6 mois.',
  },
  {
    name: 'Sophie Lavoie',
    role: 'Chargée de projets, Infratech',
    quote: 'La fiche 360° par client et l\'historique concurrentiel nous donnent un avantage stratégique réel sur nos compétiteurs.',
  },
  {
    name: 'Kevin Ouellet',
    role: 'Estimateur principal, Construction Nordique',
    quote: 'Le module d\'estimation avec l\'IA est incroyable. La détection d\'anomalies m\'a évité plusieurs erreurs coûteuses.',
  },
]

// ── Composant ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm" style={{ background: '#0D1B2A', color: '#C9A84C' }}>B</div>
            <span className="font-bold text-lg" style={{ color: '#0D1B2A' }}>Bidexa</span>
          </div>

          {/* Liens */}
          <div className="hidden md:flex items-center gap-7 text-sm text-slate-500">
            <a href="#features"     className="hover:text-slate-800 transition">Fonctionnalités</a>
            <a href="#security"     className="hover:text-slate-800 transition">Sécurité</a>
            <a href="#pricing"      className="hover:text-slate-800 transition">Tarifs</a>
            <a href="#testimonials" className="hover:text-slate-800 transition">Témoignages</a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link href="/login"    className="text-sm text-slate-600 hover:text-slate-900 font-medium transition">Connexion</Link>
            <Link href="/register" className="text-sm px-4 py-2 rounded-lg font-semibold text-white transition hover:opacity-90" style={{ background: '#C9A84C' }}>Essai gratuit</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-20 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-7 border" style={{ borderColor: '#C9A84C', color: '#C9A84C', background: '#fef9ec' }}>
          <ShieldCheck size={12} />
          Sécurité multicouche · IA intégrée avec quota par forfait
        </div>

        {/* Titre */}
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-5 max-w-3xl mx-auto" style={{ color: '#0D1B2A' }}>
          L&apos;ERP intelligent pour vos{' '}
          <span style={{ color: '#C9A84C' }}>soumissions & projets</span>
        </h1>
        <p className="text-xl text-slate-500 mb-9 max-w-2xl mx-auto leading-relaxed">
          De l&apos;opportunité à la facturation — Bidexa centralise tout le cycle de vie de vos projets de construction dans une plateforme unifiée, sécurisée et intelligente.
        </p>

        {/* CTA */}
        <div className="flex justify-center gap-4 flex-wrap mb-16">
          <Link href="/register" className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-white text-sm transition hover:opacity-90 shadow-lg shadow-slate-200" style={{ background: '#0D1B2A' }}>
            Essayer gratuitement <ChevronRight size={16} />
          </Link>
          <Link href="/login" className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm border-2 border-slate-200 hover:border-amber-300 transition" style={{ color: '#0D1B2A' }}>
            Se connecter
          </Link>
        </div>

        {/* Pipeline visuel */}
        <div className="mb-14">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">Cycle de vie complet</p>
          <div className="flex items-center justify-center flex-wrap gap-0">
            {PIPELINE.map((step, i) => (
              <div key={step.label} className="flex items-center">
                <div
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white whitespace-nowrap shadow-sm"
                  style={{ background: step.color }}
                >
                  {step.label}
                </div>
                {i < PIPELINE.length - 1 && (
                  <ArrowRight size={16} className="mx-1 shrink-0" style={{ color: '#C9A84C' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 max-w-md mx-auto">
          {[
            ['500+',  'Entreprises'],
            ['12 M$+', 'Soumissions gérées'],
            ['98%',   'Satisfaction client'],
          ].map(([val, lab]) => (
            <div key={lab} className="text-center">
              <div className="text-2xl font-extrabold" style={{ color: '#C9A84C' }}>{val}</div>
              <div className="text-xs text-slate-400 mt-0.5">{lab}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── MODULES (12 cartes avec modals) ────────────────────────────────── */}
      <ModulesSection />

      {/* ── SÉCURITÉ (rassurant, non technique) ───────────────────────────── */}
      <section id="security" className="py-20" style={{ background: '#0D1B2A' }}>
        <div className="max-w-5xl mx-auto px-6">

          {/* En-tête */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-5 border border-amber-400/30" style={{ color: '#C9A84C', background: 'rgba(201,168,76,0.08)' }}>
              <ShieldCheck size={12} /> Vos données sont entre de bonnes mains
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">
              Une plateforme conçue pour inspirer confiance
            </h2>
            <p className="text-white/50 text-base max-w-xl mx-auto leading-relaxed">
              La sécurité est au cœur de Bidexa. Vos données, vos documents et vos accès sont protégés à chaque étape — sans effort de votre part.
            </p>
          </div>

          {/* 4 piliers rassurants */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {[
              {
                icon: <Lock size={20} />,
                title: 'Accès sécurisé',
                desc: 'Connexion protégée avec verrouillage automatique en cas de tentatives suspectes.',
              },
              {
                icon: <ShieldCheck size={20} />,
                title: 'Données privées',
                desc: 'Vos informations sont isolées et accessibles uniquement par vos utilisateurs autorisés.',
              },
              {
                icon: <Bot size={20} />,
                title: 'IA maîtrisée',
                desc: 'L\'utilisation de l\'IA est contrôlée et limitée selon votre forfait, sans dérapage de coûts.',
              },
              {
                icon: <BookOpen size={20} />,
                title: 'Traçabilité complète',
                desc: 'Chaque action importante est enregistrée — qui a fait quoi, et quand.',
              },
            ].map(item => (
              <div key={item.title} className="rounded-2xl p-6 border border-white/10 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>
                  {item.icon}
                </div>
                <h3 className="font-semibold text-white text-sm mb-2">{item.title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Bande de confiance */}
          <div className="rounded-2xl border border-white/10 px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-6" style={{ background: 'rgba(201,168,76,0.06)' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Votre équipe peut travailler en toute sérénité</p>
                <p className="text-white/40 text-xs mt-0.5">Bidexa gère la sécurité en arrière-plan — vous vous concentrez sur vos projets.</p>
              </div>
            </div>
            <Link
              href="/register"
              className="shrink-0 flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition hover:opacity-90 whitespace-nowrap"
              style={{ background: '#C9A84C', color: '#0D1B2A' }}
            >
              Démarrer en sécurité <ChevronRight size={14} />
            </Link>
          </div>

        </div>
      </section>

      {/* ── FORFAITS ───────────────────────────────────────────────────────── */}
      <PricingSection />

      {/* ── TÉMOIGNAGES ────────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-20" style={{ background: '#f8fafc' }}>
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12" style={{ color: '#0D1B2A' }}>Ils font confiance à Bidexa</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-md transition">
                <div className="flex gap-0.5 mb-4">
                  {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="#C9A84C" color="#C9A84C" />)}
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-5 italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0" style={{ background: '#0D1B2A' }}>
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm">{t.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ──────────────────────────────────────────────────────── */}
      <section className="py-20" style={{ background: '#0D1B2A' }}>
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6 border border-amber-400/30" style={{ color: '#C9A84C', background: 'rgba(201,168,76,0.08)' }}>
            <Zap size={12} /> Démarrez en moins de 2 minutes
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">
            Prêt à transformer votre gestion de projets ?
          </h2>
          <p className="text-white/50 text-sm mb-8 leading-relaxed">
            Créez votre compte gratuitement. Aucune carte de crédit requise.<br/>
            Sécurisé, hébergé et protégé dès le premier clic.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link href="/register" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition hover:opacity-90 shadow-lg" style={{ background: '#C9A84C', color: '#0D1B2A' }}>
              Créer mon compte gratuit <ChevronRight size={16} />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm border border-white/20 text-white hover:border-white/40 transition">
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs" style={{ background: '#0D1B2A', color: '#C9A84C' }}>B</div>
            <span className="font-semibold text-sm text-slate-600">Bidexa</span>
          </div>
          <p className="text-xs text-slate-400">© 2025 Bidexa inc. Tous droits réservés.</p>
          <div className="flex gap-5 text-xs text-slate-400">
            <a href="#" className="hover:text-slate-600 transition">Confidentialité</a>
            <a href="#" className="hover:text-slate-600 transition">Conditions</a>
            <a href="#" className="hover:text-slate-600 transition">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  )
}

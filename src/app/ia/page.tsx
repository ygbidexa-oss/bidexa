'use client'
import { useState, useRef, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Send, Bot, User, Sparkles, FileText, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SCENARIOS = [
  { icon: <FileText size={16} />, label: 'Extraire PDF AO', prompt: 'Extraire les données du dossier d\'appel d\'offres AO-2024-078.pdf' },
  { icon: <DollarSign size={16} />, label: 'Suggestion de prix', prompt: 'Suggère un prix compétitif pour un projet de réfection d\'aqueduc de 800m en milieu urbain, budget estimé 1,2 M$' },
  { icon: <TrendingUp size={16} />, label: 'Prédiction de succès', prompt: 'Quelle est la probabilité de succès pour la soumission SOI-2024-019 chez la Ville de Québec?' },
  { icon: <AlertTriangle size={16} />, label: 'Anomalie budget', prompt: 'Analyser le budget du projet PRJ-2024-003 et détecter les anomalies' },
]

const RESPONSES: Record<string, string> = {
  'extraire': `**Extraction PDF — AO-2024-078.pdf** ✅

📋 **Informations extraites :**
- **Donneur d'ouvrage :** Ville de Lévis — Direction des travaux publics
- **Type :** Appel d'offres public (SEAO #2024-78341)
- **Objet :** Réfection de chaussée — secteur Pintendre, phases 1 et 2
- **Valeur estimée :** 850 000 $ – 1 200 000 $ (fourchette)
- **Date de dépôt :** 2024-02-28 à 14h00
- **Durée des travaux :** 90 jours calendriers
- **Cautionnement :** 10 % du prix soumis
- **Addenda :** 2 addenda émis (01 et 02)

⚠️ **Points d'attention détectés :**
- Clause pénale : 500 $/jour de retard
- Exigence ISO 9001 pour le béton bitumineux
- Visite de chantier obligatoire (2024-02-12 09h00)

✅ **Checklist conformité :** 8/10 — 2 documents manquants (attestation RBQ, références récentes)`,

  'prix': `**Analyse — Suggestion de prix pour réfection aqueduc 800m** 💡

📊 **Analyse basée sur l'historique concurrentiel :**

| Scénario | Prix suggéré | Marge | Probabilité |
|---|---|---|---|
| Agressif | 1 085 000 $ | 8,5% | 72% |
| **Recommandé** | **1 142 000 $** | **12%** | **58%** |
| Conservateur | 1 210 000 $ | 16% | 41% |

🎯 **Prix recommandé : 1 142 000 $**

**Facteurs pris en compte :**
- Historique Ville de Québec : 3 AO similaires, prix gagnant moyen 1 118 000 $
- Concurrent principal (Excavations Gauthier) : soumission moyenne -3,2% vs notre prix
- Saison (travaux été) : prime +2% sur MO recommandée
- Indices matériaux Q1-2024 : béton +4,1%, fonte +6,8%

⚡ *Intervalle de confiance : ±8% selon conditions de sol*`,

  'probabilit': `**Analyse de succès — SOI-2024-019** 📈

🎯 **Score de succès prédit : 67%**

**Facteurs positifs (+) :**
- ✅ Historique avec Ville de Québec : 2 contrats gagnés sur 3 AO
- ✅ Marge actuelle (12,4%) dans la fourchette historique gagnante
- ✅ Estimateur JB Côté : taux de succès 57% sur ce type de projet
- ✅ Dossier technique complet (checklist 100%)

**Facteurs de risque (-) :**
- ⚠️ 5 soumissionnaires attendus (compétition élevée)
- ⚠️ Excavations Gauthier a gagné les 2 derniers AO similaires
- ⚠️ Notre prix est 4% au-dessus de notre meilleure estimation concurrentielle

**Recommandation IA :**
Réduire la marge de 12,4% → 10,8% pour aligner sur le prix cible concurrentiel.
Impact : -18 200 $ sur profit estimé, +12 pts sur probabilité de succès.`,

  'anomal': `**Analyse budgétaire — PRJ-2024-003** 🔍

⚠️ **3 anomalies détectées :**

**1. Dépassement main-d'œuvre (critique)**
- Budget MO : 285 000 $ | Engagé à 60% avancement : 198 400 $
- Projection fin : 330 700 $ (+16% vs budget)
- Cause probable : heures supplémentaires semaines 8-12 non budgétées

**2. Sous-consommation équipements (attention)**
- Budget équip. : 145 000 $ | Utilisé : 38 200 $ (26%)
- Avancement : 60% → équipements lourds non encore mobilisés?
- Risque : dépenses concentrées en fin de projet

**3. Écart sous-traitance électrique**
- Contrat signé : 189 000 $ vs estimation : 165 000 $ (+14,5%)
- Ordre de changement #2 non reflété dans budget de contrôle

📋 **Actions recommandées :**
1. Réviser prévision MO avec chargé de projet
2. Valider planning mobilisation équipements
3. Mettre à jour budget de contrôle avec OC #2`,
}

function getResponse(input: string): string {
  const lower = input.toLowerCase()
  if (lower.includes('extraire') || lower.includes('pdf') || lower.includes('ao-2024')) return RESPONSES['extraire']
  if (lower.includes('prix') || lower.includes('suggère') || lower.includes('compét')) return RESPONSES['prix']
  if (lower.includes('probabilit') || lower.includes('succès') || lower.includes('soi-2024')) return RESPONSES['probabilit']
  if (lower.includes('anomal') || lower.includes('budget') || lower.includes('prj-2024')) return RESPONSES['anomal']
  return `Je comprends votre demande. En tant qu'assistant IA Bidexa, je peux vous aider avec :

- **Extraction de données** depuis vos documents PDF d'appels d'offres
- **Suggestion de prix** basée sur l'historique concurrentiel
- **Prédiction de succès** pour vos soumissions en cours
- **Détection d'anomalies** dans vos budgets de projet

Essayez l'un des scénarios pré-définis à gauche, ou posez-moi une question plus précise sur un dossier spécifique.`
}

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
    .replace(/\| (.+?) \|/g, (m) => m)
}

export default function IAPage() {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: 'Bonjour ! Je suis l\'assistant IA Bidexa. Je peux analyser vos dossiers d\'appels d\'offres, suggérer des prix compétitifs, prédire vos chances de succès et détecter des anomalies budgétaires. Comment puis-je vous aider ?',
    timestamp: new Date(),
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = (text?: string) => {
    const msg = text ?? input.trim()
    if (!msg) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date() }])
    setLoading(true)
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: getResponse(msg), timestamp: new Date() }])
      setLoading(false)
    }, 900 + Math.random() * 600)
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-140px)]">
      {/* Left panel */}
      <div className="w-64 shrink-0 space-y-4">
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-amber-500" />
            <span className="text-sm font-semibold text-slate-700">Scénarios IA</span>
          </div>
          <div className="space-y-2">
            {SCENARIOS.map(s => (
              <button key={s.label} onClick={() => send(s.prompt)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-600 hover:text-amber-700 transition">
                <span className="text-amber-500">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-xs font-semibold text-slate-500 mb-2">Capacités</p>
          <ul className="space-y-1.5 text-xs text-slate-500">
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />Extraction PDF AO</li>
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />Suggestion de prix</li>
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />Prédiction de succès</li>
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />Détection d'anomalies</li>
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />Génération de rapports</li>
          </ul>
        </Card>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <Card className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${m.role === 'assistant' ? 'bg-amber-100 text-amber-600' : 'bg-navy-100 text-slate-600'}`}
                  style={m.role === 'assistant' ? {} : { background: '#e2e8f0' }}>
                  {m.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'assistant' ? 'bg-slate-50 border border-slate-100 text-slate-700' : 'text-white'}`}
                  style={m.role === 'user' ? { background: '#0D1B2A' } : {}}>
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                  <p className={`text-xs mt-1.5 ${m.role === 'assistant' ? 'text-slate-400' : 'text-slate-300'}`}>
                    {m.timestamp.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><Bot size={16} /></div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-slate-100 p-4">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder="Posez une question ou décrivez votre besoin..."
                className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-300"
              />
              <button onClick={() => send()} disabled={!input.trim() || loading}
                className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition flex items-center gap-1.5"
                style={{ background: '#C9A84C' }}>
                <Send size={15} />
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

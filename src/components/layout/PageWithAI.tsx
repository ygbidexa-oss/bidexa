'use client'
import { AIAssistant } from '@/components/ia/AIAssistant'

interface PageWithAIProps {
  children: React.ReactNode
  module: string
  title?: string
}

export function PageWithAI({ children, module, title }: PageWithAIProps) {
  return (
    <div className="flex gap-5 min-h-full">
      {/* Contenu principal — suit la hauteur naturelle du contenu */}
      <div className="flex-1 min-w-0">
        {children}
      </div>

      {/* Panneau IA — droite, sticky dans le viewport */}
      <div className="w-80 shrink-0">
        <div className="sticky top-0 max-h-screen overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 112px)' }}>
          <AIAssistant module={module} title={title} />
        </div>
      </div>
    </div>
  )
}

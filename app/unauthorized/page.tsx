'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function UnauthorizedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-destructive/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-32 w-[300px] h-[300px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center max-w-md relative z-10 animate-fade-in">
        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🔒</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-black text-foreground mb-3">Acceso Denegado</h1>

        {/* Description */}
        <p className="text-muted-foreground mb-8 leading-relaxed">
          No tienes permiso para acceder a este restaurante. Si crees que es un error, verifica que estés usando la cuenta correcta.
        </p>

        {/* Error Code */}
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-8 text-left">
          <p className="text-sm text-destructive font-medium">
            Error: Acceso no autorizado (401)
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Este incidente ha sido registrado.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.back()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-bold transition-all shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-95"
          >
            Volver Atrás
          </button>
          <Link href="/" className="block w-full py-3 rounded-xl border-2 border-border hover:border-primary/40 hover:bg-primary/5 text-foreground font-bold text-center transition-all active:scale-95">
            Ir al Inicio
          </Link>
        </div>

        {/* Help */}
        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-3">¿Necesitas ayuda?</p>
          <a
            href="mailto:soporte@eccofood.com"
            className="text-primary hover:text-primary/80 font-semibold transition-colors text-sm"
          >
            Contactar al Soporte →
          </a>
        </div>
      </div>
    </div>
  )
}

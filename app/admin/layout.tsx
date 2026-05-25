import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  if (!hasSupabaseConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-2xl rounded-3xl border border-orange-400/20 bg-white/10 p-8 shadow-2xl shadow-black/30 backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">Configuracion pendiente</p>
          <h1 className="mt-4 text-3xl font-black">Faltan variables de Supabase</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/70">
            Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel para activar el panel administrativo.
          </p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Only allow the super admin
  const ownerEmails = ['thesecretcam7@gmail.com']
  if (!user || !user.email || !ownerEmails.includes(user.email)) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Decorative gradient backgrounds */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -left-20 w-80 h-80 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Only require authentication - any logged-in user can access
  // In production, you can add role-based access control here
  if (!user) {
    redirect('/login')
  }

  return (
    <div>
      {children}
    </div>
  )
}

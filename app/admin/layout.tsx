import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Only allow the super admin
  const ownerEmails = ['thesecretcam7@gmail.com']
  if (!user || !user.email || !ownerEmails.includes(user.email)) {
    redirect('/login')
  }

  return (
    <div>
      {children}
    </div>
  )
}

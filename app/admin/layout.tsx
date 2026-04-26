import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check if user is the super-admin (you can add specific user IDs)
  // For now, we'll allow the owner email
  if (!user || user.email !== 'thesecretcam7@gmail.com') {
    redirect('/login')
  }

  return (
    <div>
      {children}
    </div>
  )
}

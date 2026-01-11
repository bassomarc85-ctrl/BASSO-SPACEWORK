import React from 'react'
import { supabase } from './supabase'
import type { Profile, Role } from './types'
function withTimeout<T>(p: Promise<T>, ms = 10000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout conectando con Supabase')), ms))
  ]);
}


type AuthState = {
  loading: boolean
  userId: string | null
  email: string | null
  role: Role | null
  profile: Profile | null
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = React.createContext<AuthState | null>(null)

async function ensureProfile(userId: string, email: string | null) {
  const { data: existing, error: selErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  if (selErr) throw selErr
  if (!existing) {
    const { error: insErr } = await supabase.from('profiles').insert({ id: userId, email, role: 'user' })
    if (insErr) throw insErr
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = React.useState(true)
  const [userId, setUserId] = React.useState<string | null>(null)
  const [email, setEmail] = React.useState<string | null>(null)
  const [role, setRole] = React.useState<Role | null>(null)
  const [profile, setProfile] = React.useState<Profile | null>(null)

  const refresh = React.useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    const user = data.session?.user ?? null
    if (!user) {
      setUserId(null); setEmail(null); setRole(null); setProfile(null)
      return
    }
    setUserId(user.id)
    setEmail(user.email ?? null)
    await ensureProfile(user.id, user.email ?? null)

    const { data: prof, error } = await supabase
      .from('profiles')
      .select('id,email,role')
      .eq('id', user.id)
      .single()
    if (error) throw error
    setProfile(prof as Profile)
    setRole((prof as Profile).role)
  }, [])

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
  await withTimeout(refresh(), 10000);
} catch (e) {
  console.error(e);
  // fuerza cierre de sesión si se queda en un estado raro
  try { await supabase.auth.signOut(); } catch {}
} finally {
  if (mounted) setLoading(false);
}
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [refresh])

  const signOut = React.useCallback(async () => { await supabase.auth.signOut() }, [])

  return (
    <AuthContext.Provider value={{ loading, userId, email, role, profile, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

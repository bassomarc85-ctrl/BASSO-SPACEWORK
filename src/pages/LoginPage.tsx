import React from 'react'
import { supabase } from '../supabase'

export default function LoginPage() {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setBusy(true);
  setError(null);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    // opcional: si quieres asegurar navegación post-login
    // navigate("/");
  } catch (err: any) {
    setError(err?.message ?? String(err));
  } finally {
    setBusy(false);
  }
}



  return (
    <div className="container">
      <div className="card" style={{maxWidth: 480, margin: '40px auto'}}>
        <h3 style={{marginTop: 0}}>Acceso</h3>
        <form onSubmit={onSubmit}>
          <div className="row">
            <div>
              <label>Email</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" required />
            </div>
            <div>
              <label>Contraseña</label>
              <input value={password} onChange={e => setPassword(e.target.value)} type="password" required />
            </div>
          </div>
          {error && <div style={{marginTop: 10, color: '#ffb4b4'}}>{error}</div>}
          <div style={{marginTop: 12}}>
            <button className="primary" disabled={busy} type="submit">{busy ? 'Entrando…' : 'Entrar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

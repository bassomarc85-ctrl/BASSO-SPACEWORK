import React from 'react'
import { Navigate, Route, Routes, Link } from 'react-router-dom'
import { useAuth } from './auth'
import LoginPage from './pages/LoginPage'
import AdminHome from './pages/admin/AdminHome'
import LeadHome from './pages/lead/LeadHome'
import LeadPlanPage from './pages/lead/LeadPlanPage'

function Shell({ children }: { children: React.ReactNode }) {
  const { role, signOut, email } = useAuth()
  return (
    <div className="container">
      <div className="row" style={{alignItems:'center'}}>
        <div style={{minWidth: 260}}>
          <h2 style={{margin: 0}}>Basso Work Space</h2>
          <div style={{opacity: 0.8, fontSize: 13}}>{email ?? ''}</div>
        </div>
        <div style={{flex: 2}} />
        <div style={{minWidth: 220}}>
          <button onClick={() => void signOut()}>Cerrar sesión</button>
        </div>
      </div>

      <div className="nav">
        {role === 'admin' && <Link to="/admin">Admin</Link>}
        {(role === 'team_lead' || role === 'admin') && <Link to="/lead">Jefe de equipo</Link>}
      </div>

      {children}
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { loading, userId } = useAuth()
  if (loading) return <div className="container"><div className="card">Cargando…</div></div>
  if (!userId) return <Navigate to="/login" replace />
  return <>{children}</>
}

function HomeRedirect() {
  const { role } = useAuth()
  if (role === 'admin') return <Navigate to="/admin" replace />
  if (role === 'team_lead') return <Navigate to="/lead" replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  const { loading, userId } = useAuth()
  if (loading) return <div className="container"><div className="card">Cargando…</div></div>

  return (
    <Routes>
      <Route path="/login" element={userId ? <HomeRedirect /> : <LoginPage />} />
      <Route path="/" element={<RequireAuth><Shell><HomeRedirect /></Shell></RequireAuth>} />
      <Route path="/admin/*" element={<RequireAuth><Shell><AdminHome /></Shell></RequireAuth>} />
      <Route path="/lead" element={<RequireAuth><Shell><LeadHome /></Shell></RequireAuth>} />
      <Route path="/lead/plan/:planId" element={<RequireAuth><Shell><LeadPlanPage /></Shell></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

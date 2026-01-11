import React from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../supabase'
import { useAuth } from '../../auth'

type PlanRow = {
  id: string
  plan_date: string
  client_name: string | null
  task_name: string | null
  pricing_mode: 'hour'|'piece'
  day_status: 'open'|'closed'
}

export default function LeadHome() {
  const { role, userId } = useAuth()
  const [plans, setPlans] = React.useState<PlanRow[]>([])
  const [error, setError] = React.useState<string | null>(null)

  async function load() {
    setError(null)
    const q = supabase
      .from('plans')
      .select('id,plan_date,pricing_mode,day_status, clients(name), tasks(name)')
      .order('plan_date', { ascending: false })
      .limit(30)

    const { data, error } = role === 'admin' ? await q : await q.eq('leader_user_id', userId!)
    if (error) return setError(error.message)

    const rows = (data ?? []) as any[]
    setPlans(rows.map(r => ({
      id: r.id,
      plan_date: r.plan_date,
      pricing_mode: r.pricing_mode,
      day_status: r.day_status,
      client_name: r.clients?.name ?? null,
      task_name: r.tasks?.name ?? null,
    })))
  }

  React.useEffect(() => { void load() }, [])

  return (
    <div className="card">
      <h3 style={{marginTop:0}}>Mis fichas</h3>
      {error && <div style={{marginTop:10, color:'#ffb4b4'}}>{error}</div>}
      <table style={{marginTop:12}}>
        <thead><tr><th>Fecha</th><th>Cliente</th><th>Trabajo</th><th>Modo</th><th>Estado</th><th style={{width:140}}>Acción</th></tr></thead>
        <tbody>
          {plans.map(p => (
            <tr key={p.id}>
              <td>{p.plan_date}</td>
              <td>{p.client_name ?? '-'}</td>
              <td>{p.task_name ?? '-'}</td>
              <td>{p.pricing_mode}</td>
              <td><span className={'badge ' + (p.day_status === 'closed' ? 'closed' : 'open')}>{p.day_status}</span></td>
              <td><Link to={`/lead/plan/${p.id}`}>Abrir</Link></td>
            </tr>
          ))}
          {plans.length===0 && <tr><td colSpan={6} style={{opacity:0.7}}>Sin fichas</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

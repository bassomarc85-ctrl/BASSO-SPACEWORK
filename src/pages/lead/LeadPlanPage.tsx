import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../supabase'
import { useAuth } from '../../auth'

type Task = { id: string; name: string }
type WorkerLine = {
  id: string
  worker_name: string
  hours_worked: number | null
  piece_count: number | null
  worker_task_id: string | null
  work_note: string | null
}

type PlanHead = {
  plan_date: string
  pricing_mode: 'hour'|'piece'
  day_status: 'open'|'closed'
  client_name: string | null
  task_name: string | null
  leader_user_id: string | null
}

export default function LeadPlanPage() {
  const { planId } = useParams()
  const { userId, role } = useAuth()
  const [plan, setPlan] = React.useState<PlanHead | null>(null)
  const [lines, setLines] = React.useState<WorkerLine[]>([])
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  async function loadAll() {
    setError(null)
    const [p, l, t] = await Promise.all([
      supabase.from('plans').select('plan_date,pricing_mode,day_status,leader_user_id, clients(name), tasks(name)').eq('id', planId!).single(),
      supabase.from('plan_workers').select('id,hours_worked,piece_count,worker_task_id,work_note, workers(display_name)').eq('plan_id', planId!).order('created_at'),
      supabase.from('tasks').select('id,name').order('name'),
    ])
    if (p.error) throw p.error
    if (l.error) throw l.error
    if (t.error) throw t.error

    if (role !== 'admin' && (p.data as any).leader_user_id !== userId) throw new Error('No tienes acceso a esta ficha')

    setPlan({
      plan_date: (p.data as any).plan_date,
      pricing_mode: (p.data as any).pricing_mode,
      day_status: (p.data as any).day_status,
      leader_user_id: (p.data as any).leader_user_id,
      client_name: (p.data as any).clients?.name ?? null,
      task_name: (p.data as any).tasks?.name ?? null,
    })

    setLines(((l.data ?? []) as any[]).map(r => ({
      id: r.id,
      worker_name: r.workers?.display_name ?? '—',
      hours_worked: r.hours_worked,
      piece_count: r.piece_count,
      worker_task_id: r.worker_task_id,
      work_note: r.work_note,
    })))
    setTasks((t.data ?? []) as Task[])
  }

  React.useEffect(() => { if (planId) void loadAll() }, [planId])

  function patchLine(id: string, patch: Partial<WorkerLine>) {
    setLines(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))
  }

  async function saveAll() {
    setBusy(true); setError(null)
    try {
      for (const l of lines) {
        const { error } = await supabase.from('plan_workers').update({
          hours_worked: l.hours_worked,
          piece_count: l.piece_count,
          worker_task_id: l.worker_task_id,
          work_note: l.work_note,
        }).eq('id', l.id)
        if (error) throw error
      }
      await loadAll()
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  async function closePlan() {
    if (!confirm('Cerrar ficha?')) return
    setBusy(true); setError(null)
    try {
      await saveAll()
      const { error } = await supabase.from('plans').update({ day_status: 'closed', closed_at: new Date().toISOString() }).eq('id', planId!)
      if (error) throw error
      await loadAll()
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  if (!plan) {
    return <div className="card"><Link to="/lead">← Volver</Link><div style={{marginTop:10}}>{error ?? 'Cargando…'}</div></div>
  }

  return (
    <div className="card">
      <div style={{marginBottom: 10}}><Link to="/lead">← Volver</Link></div>
      <h3 style={{marginTop:0}}>Ficha {plan.plan_date}</h3>
      <div style={{opacity:0.85}}>
        Cliente: <strong>{plan.client_name ?? '-'}</strong> · Trabajo: <strong>{plan.task_name ?? '-'}</strong> · Modo: <strong>{plan.pricing_mode}</strong> · Estado: <span className={'badge ' + (plan.day_status === 'closed' ? 'closed' : 'open')}>{plan.day_status}</span>
      </div>

      {error && <div style={{marginTop:10, color:'#ffb4b4'}}>{error}</div>}

      <div className="row" style={{marginTop: 12}}>
        <div style={{minWidth: 220}}>
          <button className="primary" disabled={busy || plan.day_status==='closed'} onClick={() => void saveAll()}>{busy?'Guardando…':'Guardar'}</button>
        </div>
        <div style={{minWidth: 220}}>
          <button disabled={busy || plan.day_status==='closed'} onClick={() => void closePlan()}>Cerrar ficha</button>
        </div>
      </div>

      <table style={{marginTop:12}}>
        <thead><tr><th>Trabajador</th><th style={{width:140}}>Horas</th><th style={{width:140}}>Destajo</th><th style={{width:260}}>Designación</th><th>Nota</th></tr></thead>
        <tbody>
          {lines.map(l => (
            <tr key={l.id}>
              <td>{l.worker_name}</td>
              <td><input type="number" step="0.25" min="0" value={l.hours_worked ?? ''} disabled={plan.day_status==='closed'}
                onChange={e => patchLine(l.id, { hours_worked: e.target.value===''?null:Number(e.target.value) })} /></td>
              <td><input type="number" step="1" min="0" value={l.piece_count ?? ''} disabled={plan.day_status==='closed'}
                onChange={e => patchLine(l.id, { piece_count: e.target.value===''?null:Number(e.target.value) })} /></td>
              <td>
                <select value={l.worker_task_id ?? ''} disabled={plan.day_status==='closed'}
                  onChange={e => patchLine(l.id, { worker_task_id: e.target.value || null })}>
                  <option value="">(igual que ficha)</option>
                  {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </td>
              <td><input value={l.work_note ?? ''} disabled={plan.day_status==='closed'} placeholder="Opcional"
                onChange={e => patchLine(l.id, { work_note: e.target.value || null })} /></td>
            </tr>
          ))}
          {lines.length===0 && <tr><td colSpan={5} style={{opacity:0.7}}>Sin trabajadores</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

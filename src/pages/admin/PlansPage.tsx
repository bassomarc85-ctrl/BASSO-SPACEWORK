import React from 'react'
import { supabase } from '../../supabase'

type Client = { id: string; name: string }
type Worker = { id: string; display_name: string }
type Task = { id: string; name: string; unit: 'hour'|'piece' }
type Leader = { id: string; email: string | null }

type PlanListRow = {
  id: string
  plan_date: string
  client_name: string | null
  task_name: string | null
  leader_email: string | null
  pricing_mode: 'hour'|'piece'
  day_status: 'open'|'closed'
}

function todayISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth()+1).padStart(2,'0')
  const dd = String(d.getDate()).padStart(2,'0')
  return `${yyyy}-${mm}-${dd}`
}

export default function PlansPage() {
  const [clients, setClients] = React.useState<Client[]>([])
  const [workers, setWorkers] = React.useState<Worker[]>([])
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [leaders, setLeaders] = React.useState<Leader[]>([])
  const [plans, setPlans] = React.useState<PlanListRow[]>([])

  const [planDate, setPlanDate] = React.useState(todayISO())
  const [clientId, setClientId] = React.useState('')
  const [taskId, setTaskId] = React.useState('')
  const [pricingMode, setPricingMode] = React.useState<'hour'|'piece'>('hour')
  const [leaderUserId, setLeaderUserId] = React.useState('')
  const [note, setNote] = React.useState('')
  const [assignedWorkerIds, setAssignedWorkerIds] = React.useState<string[]>([])

  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function loadRef() {
    const [c, w, t, l] = await Promise.all([
      supabase.from('clients').select('id,name').order('name'),
      supabase.from('workers').select('id,display_name').eq('is_active', true).order('display_name'),
      supabase.from('tasks').select('id,name,unit').order('name'),
      supabase.from('profiles').select('id,email,role').in('role', ['team_lead','admin']).order('email'),
    ])
    if (c.error) throw c.error
    if (w.error) throw w.error
    if (t.error) throw t.error
    if (l.error) throw l.error
    setClients((c.data ?? []) as Client[])
    setWorkers((w.data ?? []) as Worker[])
    setTasks((t.data ?? []) as Task[])
    setLeaders(((l.data ?? []) as any[]).map(x => ({ id: x.id, email: x.email })))
  }

  async function loadPlans() {
    const { data, error } = await supabase
      .from('plans')
      .select('id,plan_date,pricing_mode,day_status, clients(name), tasks(name), profiles(email)')
      .order('plan_date', { ascending: false })
      .limit(30)
    if (error) throw error
    const rows = (data ?? []) as any[]
    setPlans(rows.map(r => ({
      id: r.id,
      plan_date: r.plan_date,
      pricing_mode: r.pricing_mode,
      day_status: r.day_status,
      client_name: r.clients?.name ?? null,
      task_name: r.tasks?.name ?? null,
      leader_email: r.profiles?.email ?? null,
    })))
  }

  React.useEffect(() => {
    ;(async () => {
      try {
        setError(null)
        await loadRef()
        await loadPlans()
      } catch (e: any) {
        setError(e?.message ?? String(e))
      }
    })()
  }, [])

  function toggleWorker(id: string) {
    setAssignedWorkerIds(prev => prev.includes(id) ? prev.filter(x => x!==id) : [...prev, id])
  }

  async function createPlan() {
    setBusy(true); setError(null)
    try {
      if (!planDate) throw new Error('Fecha requerida')
      if (!clientId) throw new Error('Cliente requerido')
      if (!taskId) throw new Error('Trabajo requerido')
      if (!leaderUserId) throw new Error('Jefe de equipo requerido')
      if (assignedWorkerIds.length === 0) throw new Error('Asigna al menos 1 trabajador')

      const { data: planRow, error: planErr } = await supabase
        .from('plans')
        .insert({
          plan_date: planDate,
          client_id: clientId,
          task_id: taskId,
          pricing_mode: pricingMode,
          leader_user_id: leaderUserId,
          note: note || null,
          day_status: 'open',
        })
        .select('id')
        .single()
      if (planErr) throw planErr

      const inserts = assignedWorkerIds.map(wid => ({
        plan_id: planRow.id,
        worker_id: wid,
        hours_worked: null,
        piece_count: null,
        worker_task_id: null,
        work_note: null,
      }))
      const { error: pwErr } = await supabase.from('plan_workers').insert(inserts)
      if (pwErr) throw pwErr

      setAssignedWorkerIds([])
      setNote('')
      await loadPlans()
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  async function closePlan(planId: string) {
    if (!confirm('Cerrar ficha?')) return
    const { error } = await supabase.from('plans').update({ day_status: 'closed', closed_at: new Date().toISOString() }).eq('id', planId)
    if (error) setError(error.message)
    await loadPlans()
  }

  async function reopenPlan(planId: string) {
    if (!confirm('Reabrir ficha?')) return
    const { error } = await supabase.from('plans').update({ day_status: 'open', reopened_at: new Date().toISOString() }).eq('id', planId)
    if (error) setError(error.message)
    await loadPlans()
  }

  return (
    <div>
      <h4>Fichas diarias</h4>

      <div className="card" style={{marginBottom: 14}}>
        <div className="row">
          <div>
            <label>Fecha</label>
            <input type="date" value={planDate} onChange={e=>setPlanDate(e.target.value)} />
          </div>
          <div>
            <label>Cliente</label>
            <select value={clientId} onChange={e=>setClientId(e.target.value)}>
              <option value="">-- Selecciona --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label>Trabajo principal</label>
            <select value={taskId} onChange={e=>setTaskId(e.target.value)}>
              <option value="">-- Selecciona --</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.name} ({t.unit === 'hour' ? 'horas' : 'destajo'})</option>)}
            </select>
          </div>
          <div>
            <label>Modo facturación</label>
            <select value={pricingMode} onChange={e=>setPricingMode(e.target.value as any)}>
              <option value="hour">Horas</option>
              <option value="piece">Destajo</option>
            </select>
          </div>
          <div>
            <label>Jefe de equipo</label>
            <select value={leaderUserId} onChange={e=>setLeaderUserId(e.target.value)}>
              <option value="">-- Selecciona --</option>
              {leaders.map(l => <option key={l.id} value={l.id}>{l.email ?? l.id}</option>)}
            </select>
          </div>
        </div>

        <div style={{marginTop: 10}}>
          <label>Nota (opcional)</label>
          <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} />
        </div>

        <div style={{marginTop: 10}}>
          <div style={{fontWeight: 600, marginBottom: 6}}>Equipo asignado</div>
          <div className="row">
            {workers.map(w => (
              <label key={w.id} style={{display:'flex', gap:8, alignItems:'center', minWidth: 220}}>
                <input
                  type="checkbox"
                  checked={assignedWorkerIds.includes(w.id)}
                  onChange={() => toggleWorker(w.id)}
                  style={{width: 18, height: 18}}
                />
                <span>{w.display_name}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{marginTop: 12}}>
          <button className="primary" disabled={busy} onClick={() => void createPlan()}>
            {busy ? 'Creando…' : 'Crear ficha'}
          </button>
        </div>

        {error && <div style={{marginTop: 10, color:'#ffb4b4'}}>{error}</div>}
      </div>

      <h4>Últimas fichas</h4>
      <table>
        <thead>
          <tr>
            <th>Fecha</th><th>Cliente</th><th>Trabajo</th><th>Jefe</th><th>Estado</th><th style={{width: 220}}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {plans.map(p => (
            <tr key={p.id}>
              <td>{p.plan_date}</td>
              <td>{p.client_name ?? '-'}</td>
              <td>{p.task_name ?? '-'}</td>
              <td>{p.leader_email ?? '-'}</td>
              <td><span className={'badge ' + (p.day_status === 'closed' ? 'closed' : 'open')}>{p.day_status}</span></td>
              <td>
                {p.day_status === 'open'
                  ? <button onClick={() => void closePlan(p.id)}>Cerrar</button>
                  : <button onClick={() => void reopenPlan(p.id)}>Reabrir</button>
                }
              </td>
            </tr>
          ))}
          {plans.length===0 && <tr><td colSpan={6} style={{opacity:0.7}}>Sin fichas</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

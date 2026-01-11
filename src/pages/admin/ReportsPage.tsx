import React from 'react'
import { supabase } from '../../supabase'

type Row = {
  plan_date: string
  client_name: string | null
  task_name: string | null
  pricing_mode: 'hour'|'piece'
  day_status: 'open'|'closed'
  worker_name: string
  hours_worked: number | null
  piece_count: number | null
  worker_task_name: string | null
}

function toCsv(rows: Row[]) {
  const headers = ['plan_date','client','task','pricing_mode','day_status','worker','hours_worked','piece_count','worker_task']
  const esc = (v: any) => {
    const s = (v ?? '').toString()
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s
  }
  return [headers.join(','), ...rows.map(r => [
    r.plan_date, r.client_name, r.task_name, r.pricing_mode, r.day_status, r.worker_name, r.hours_worked, r.piece_count, r.worker_task_name
  ].map(esc).join(','))].join('\n')
}

export default function ReportsPage() {
  const [from, setFrom] = React.useState('')
  const [to, setTo] = React.useState('')
  const [rows, setRows] = React.useState<Row[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  async function run() {
    setBusy(true); setError(null)
    try {
      if (!from || !to) throw new Error('Selecciona fechas Desde/Hasta')
      const { data, error } = await supabase.from('report_rows').select('*').gte('plan_date', from).lte('plan_date', to).order('plan_date')
      if (error) throw error
      setRows((data ?? []) as Row[])
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setBusy(false)
    }
  }

  function downloadCsv() {
    const csv = toCsv(rows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `basso-report_${from}_to_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <h4>Reportes</h4>
      <div className="row">
        <div><label>Desde</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)} /></div>
        <div><label>Hasta</label><input type="date" value={to} onChange={e=>setTo(e.target.value)} /></div>
        <div style={{minWidth:220}}><label>&nbsp;</label><button className="primary" disabled={busy} onClick={() => void run()}>{busy?'Cargando…':'Generar'}</button></div>
        <div style={{minWidth:220}}><label>&nbsp;</label><button disabled={rows.length===0} onClick={downloadCsv}>Exportar CSV</button></div>
      </div>
      {error && <div style={{marginTop:10, color:'#ffb4b4'}}>{error}</div>}
      <table style={{marginTop:12}}>
        <thead><tr><th>Fecha</th><th>Cliente</th><th>Trabajo</th><th>Modo</th><th>Trabajador</th><th>Horas</th><th>Destajo</th><th>Designación</th></tr></thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx}>
              <td>{r.plan_date}</td>
              <td>{r.client_name ?? '-'}</td>
              <td>{r.task_name ?? '-'}</td>
              <td>{r.pricing_mode}</td>
              <td>{r.worker_name}</td>
              <td>{r.hours_worked ?? ''}</td>
              <td>{r.piece_count ?? ''}</td>
              <td>{r.worker_task_name ?? ''}</td>
            </tr>
          ))}
          {rows.length===0 && <tr><td colSpan={8} style={{opacity:0.7}}>Sin datos</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

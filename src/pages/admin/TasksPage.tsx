import React from 'react'
import { supabase } from '../../supabase'
type Task = { id: string; name: string; unit: 'hour'|'piece' }

export default function TasksPage() {
  const [items, setItems] = React.useState<Task[]>([])
  const [name, setName] = React.useState('')
  const [unit, setUnit] = React.useState<'hour'|'piece'>('hour')
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    const { data, error } = await supabase.from('tasks').select('id,name,unit').order('name')
    if (error) setError(error.message)
    setItems((data ?? []) as Task[])
  }, [])

  React.useEffect(() => { void load() }, [load])

  async function add() {
    if (!name.trim()) return
    setError(null)
    const { error } = await supabase.from('tasks').insert({ name: name.trim(), unit })
    if (error) setError(error.message)
    setName('')
    await load()
  }

  return (
    <div>
      <h4>Trabajos</h4>
      <div className="row">
        <div><input placeholder="Nombre" value={name} onChange={e=>setName(e.target.value)} /></div>
        <div>
          <select value={unit} onChange={e=>setUnit(e.target.value as any)}>
            <option value="hour">Horas</option>
            <option value="piece">Destajo</option>
          </select>
        </div>
        <div style={{minWidth:220}}><button className="primary" onClick={() => void add()}>Añadir</button></div>
      </div>
      {error && <div style={{marginTop:10, color:'#ffb4b4'}}>{error}</div>}
      <table style={{marginTop:12}}>
        <thead><tr><th>Trabajo</th><th>Unidad</th></tr></thead>
        <tbody>{items.map(i => <tr key={i.id}><td>{i.name}</td><td>{i.unit}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

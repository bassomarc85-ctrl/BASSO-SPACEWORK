import React from 'react'
import { supabase } from '../../supabase'
type Worker = { id: string; display_name: string; is_active: boolean }

export default function WorkersPage() {
  const [items, setItems] = React.useState<Worker[]>([])
  const [name, setName] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    const { data, error } = await supabase.from('workers').select('id,display_name,is_active').order('display_name')
    if (error) setError(error.message)
    setItems((data ?? []) as Worker[])
  }, [])

  React.useEffect(() => { void load() }, [load])

  async function add() {
    if (!name.trim()) return
    setError(null)
    const { error } = await supabase.from('workers').insert({ display_name: name.trim(), is_active: true })
    if (error) setError(error.message)
    setName('')
    await load()
  }

  return (
    <div>
      <h4>Trabajadores</h4>
      <div className="row">
        <div><input placeholder="Nombre" value={name} onChange={e=>setName(e.target.value)} /></div>
        <div style={{minWidth:220}}><button className="primary" onClick={() => void add()}>Añadir</button></div>
      </div>
      {error && <div style={{marginTop:10, color:'#ffb4b4'}}>{error}</div>}
      <table style={{marginTop:12}}>
        <thead><tr><th>Nombre</th><th>Activo</th></tr></thead>
        <tbody>{items.map(i => <tr key={i.id}><td>{i.display_name}</td><td>{i.is_active ? 'Sí' : 'No'}</td></tr>)}</tbody>
      </table>
    </div>
  )
}

import React from 'react'
import { Link, Route, Routes, Navigate } from 'react-router-dom'
import { useAuth } from '../../auth'
import ClientsPage from './ClientsPage'
import WorkersPage from './WorkersPage'
import TasksPage from './TasksPage'
import PlansPage from './PlansPage'
import ReportsPage from './ReportsPage'

export default function AdminHome() {
  const { role } = useAuth()
  if (role !== 'admin') return <div className="card">No tienes permisos de admin.</div>
  return (
    <div className="card">
      <h3 style={{marginTop:0}}>Admin</h3>
      <div className="nav" style={{marginTop: 0}}>
        <Link to="/admin/clients">Clientes</Link>
        <Link to="/admin/workers">Trabajadores</Link>
        <Link to="/admin/tasks">Trabajos</Link>
        <Link to="/admin/plans">Fichas</Link>
        <Link to="/admin/reports">Reportes</Link>
      </div>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/plans" replace />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/workers" element={<WorkersPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Routes>
    </div>
  )
}

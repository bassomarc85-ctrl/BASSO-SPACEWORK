export type Role = 'admin' | 'team_lead' | 'user'
export type Profile = { id: string; email: string | null; role: Role }
export type Client = { id: string; name: string }
export type Worker = { id: string; display_name: string; is_active: boolean }
export type Task = { id: string; name: string; unit: 'hour'|'piece' }
export type Plan = { id: string; plan_date: string; client_id: string|null; leader_user_id: string|null; task_id: string|null; pricing_mode:'hour'|'piece'; note:string|null; day_status:'open'|'closed' }

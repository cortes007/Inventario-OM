import { createClient } from '@supabase/supabase-js'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY
export const configured = Boolean(url && key)
// Valores de relleno para que la app no se rompa si falta el .env
export const supabase = createClient(url || 'http://localhost', key || 'sin-configurar')
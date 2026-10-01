import { useState } from 'react'
import { Wrench } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Alert, Button, Card, Field } from './ui'
export default function Login() {
  const [f, setF] = useState({ email: '', password: '' }); const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword(f)
    if (error) setErr(error.status === 400 ? 'Correo o contraseña incorrectos' : `No se pudo conectar: ${error.message}. Revisa el archivo .env`)
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 flex items-center gap-2"><Wrench className="text-brand" /><h1 className="text-lg font-semibold">OM Herramental</h1></div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Correo"><input className="inp" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Contraseña"><input className="inp" type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          <Alert>{err}</Alert>
          <Button className="w-full justify-center">Iniciar sesión</Button>
        </form>
      </Card>
    </div>
  )
}

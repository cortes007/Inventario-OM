import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPaths = [
  resolve(projectRoot, '.env.local'),
  resolve(projectRoot, '.env'),
  resolve(projectRoot, '..', 'backend', '.env'),
]

for (const envPath of envPaths) {
  if (!existsSync(envPath)) continue
  const { error } = dotenv.config({ path: envPath })
  if (error) throw error
}

const viteCliPath = resolve(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js')
const vite = spawn(process.execPath, [viteCliPath], {
  cwd: projectRoot,
  env: process.env,
  stdio: 'inherit',
})

vite.on('error', (error) => {
  console.error('No se pudo iniciar Vite:', error.message)
  process.exitCode = 1
})

vite.on('exit', (code) => {
  process.exitCode = code ?? 1
})

export function createId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function createAssetCode() {
  return `HER-${createId().replace(/-/g, '').slice(-8).toUpperCase()}`
}

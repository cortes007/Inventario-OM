import { useCallback, useEffect, useState } from 'react'
export function useResource(fetcher, deps = []) {
  const [data, setData] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const reload = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await fetcher()) } catch (e) { setError(e.message) } finally { setLoading(false) }
  }, deps) // eslint-disable-line
  useEffect(() => { reload() }, [reload])
  return { data, loading, error, reload }
}

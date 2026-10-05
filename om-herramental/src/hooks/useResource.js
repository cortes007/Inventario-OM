import { useCallback, useEffect, useState } from 'react'
export function useResource(fetcher, deps = []) {
  const [data, setData] = useState([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    const isInitial = data.length === 0
    if (isInitial) setInitialLoading(true); else setIsRefreshing(true)
    setError('')
    try { setData(await fetcher()) } catch (e) { setError(e.message) } finally { setInitialLoading(false); setIsRefreshing(false) }
  }, deps) // eslint-disable-line
  useEffect(() => { reload() }, [reload])
  return { data, initialLoading, isRefreshing, error, reload }
}

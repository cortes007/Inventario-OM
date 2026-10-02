import { useEffect, useState } from 'react'
import { inventoryRealtimeService } from '../container'

const REFRESH_INTERVAL = 5000

export function useInventoryRealtime(reload) {
  const [status, setStatus] = useState('CONNECTING')

  useEffect(() => {
    let disposed = false
    let fallbackTimer
    let changeTimer

    const refresh = () => {
      window.clearTimeout(changeTimer)
      changeTimer = window.setTimeout(() => {
        if (!disposed) reload()
      }, 150)
    }
    const unsubscribe = inventoryRealtimeService.subscribe(refresh, ({ status: nextStatus, error }) => {
      if (disposed) return
      if (nextStatus === 'SUBSCRIBED') {
        setStatus('SUBSCRIBED')
      } else if (nextStatus === 'CHANNEL_ERROR' || nextStatus === 'TIMED_OUT' || nextStatus === 'CLOSED') {
        setStatus(error ? `${nextStatus}: ${error}` : nextStatus)
      }
    })

    const poll = async () => {
      if (disposed) return
      if (document.visibilityState === 'visible') await reload()
      if (!disposed) fallbackTimer = window.setTimeout(poll, REFRESH_INTERVAL)
    }
    fallbackTimer = window.setTimeout(poll, REFRESH_INTERVAL)

    const refreshWhenActive = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', refreshWhenActive)
    window.addEventListener('online', refresh)

    return () => {
      disposed = true
      unsubscribe()
      window.clearTimeout(fallbackTimer)
      window.clearTimeout(changeTimer)
      document.removeEventListener('visibilitychange', refreshWhenActive)
      window.removeEventListener('online', refresh)
    }
  }, [reload])

  return {
    connected: status === 'SUBSCRIBED',
    error: status === 'CONNECTING' || status === 'SUBSCRIBED' ? '' : status,
  }
}

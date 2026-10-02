export class InventoryRealtimeRepository {
  constructor(client) { this.client = client }

  subscribe(onChange, onError) {
    const channel = this.client.channel('inventario-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'herramientas' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movimientos' }, onChange)
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          onError(new Error('La conexión en tiempo real no está disponible; se usará la actualización periódica.'))
        } else if (status === 'SUBSCRIBED') {
          onError(null)
        }
      })
    return () => { this.client.removeChannel(channel) }
  }
}

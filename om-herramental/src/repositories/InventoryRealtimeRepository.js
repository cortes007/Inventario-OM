export class InventoryRealtimeRepository {
  constructor(client) { this.client = client }

  subscribe(onChange, onStatus) {
    const channel = this.client.channel('inventario-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'herramientas' }, onChange)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'movimientos' }, onChange)
      .subscribe((status, error) => {
        onStatus({ status, error: error?.message || null })
      })
    return () => { this.client.removeChannel(channel) }
  }
}

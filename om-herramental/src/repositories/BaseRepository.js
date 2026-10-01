// SRP: solo sabe hablar con una tabla. OCP: se extiende por herencia sin modificarse.
export class BaseRepository {
  constructor(client, table, select = '*') { this.c = client; this.t = table; this.s = select }
  async _run(q) { const { data, error } = await q; if (error) throw new Error(error.message); return data }
  list() { return this._run(this.c.from(this.t).select(this.s).order('created_at', { ascending: false })) }
  create(v) { return this._run(this.c.from(this.t).insert(v).select(this.s).single()) }
  update(id, v) { return this._run(this.c.from(this.t).update(v).eq('id', id).select(this.s).single()) }
  remove(id) { return this._run(this.c.from(this.t).delete().eq('id', id)) }
}

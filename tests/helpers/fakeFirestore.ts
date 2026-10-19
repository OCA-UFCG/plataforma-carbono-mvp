type Data = Record<string, unknown>

interface FakeSnapshot {
  id: string
  exists: boolean
  data(): Data | undefined
}

/**
 * The slice of the Admin SDK's Firestore that lib/access/requests.ts and the backfill script use,
 * in memory: documents by collection and id, equality filters with one ordering, listDocuments,
 * and transactions whose writes land when the callback returns.
 */
export function createFakeFirestore() {
  const collections = new Map<string, Map<string, Data>>()

  function store(name: string): Map<string, Data> {
    let docs = collections.get(name)
    if (!docs) {
      docs = new Map()
      collections.set(name, docs)
    }
    return docs
  }

  function snapshot(id: string, data: Data | undefined): FakeSnapshot {
    return { id, exists: data !== undefined, data: () => (data === undefined ? undefined : { ...data }) }
  }

  function write(name: string, id: string, data: Data, merge: boolean) {
    const current = store(name).get(id)
    if (merge && !current) throw Object.assign(new Error(`No document to update: ${name}/${id}`), { code: 5 })
    store(name).set(id, merge ? { ...current, ...data } : { ...data })
  }

  function doc(name: string, id: string) {
    return {
      id,
      get: async () => snapshot(id, store(name).get(id)),
      set: async (data: Data) => write(name, id, data, false),
      update: async (data: Data) => write(name, id, data, true),
      applyUpdate: (data: Data) => write(name, id, data, true),
    }
  }
  type FakeDoc = ReturnType<typeof doc>

  function query(name: string, filters: Array<[string, unknown]>, order: string | null) {
    return {
      where: (field: string, _op: string, value: unknown) => query(name, [...filters, [field, value]], order),
      orderBy: (field: string) => query(name, filters, field),
      get: async () => {
        const docs = [...store(name)].filter(([, data]) => filters.every(([field, value]) => data[field] === value))
        if (order) docs.sort(([, a], [, b]) => String(a[order]).localeCompare(String(b[order])))
        return { docs: docs.map(([id, data]) => snapshot(id, data)) }
      },
    }
  }

  interface FakeTransaction {
    get(ref: FakeDoc): Promise<FakeSnapshot>
    update(ref: FakeDoc, data: Data): void
  }

  const db = {
    collection: (name: string) => ({
      doc: (id: string) => doc(name, id),
      where: (field: string, op: string, value: unknown) => query(name, [], null).where(field, op, value),
      listDocuments: async () => [...store(name).keys()].map((id) => ({ id })),
    }),
    runTransaction: async <T>(callback: (transaction: FakeTransaction) => Promise<T>): Promise<T> => {
      const writes: Array<() => void> = []
      const result = await callback({
        get: (ref) => ref.get(),
        update: (ref, data) => {
          writes.push(() => ref.applyUpdate(data))
        },
      })
      for (const apply of writes) apply()
      return result
    },
  }

  return { db, store }
}

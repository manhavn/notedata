export interface StoredApiKey {
  id: string
  label: string
  value: string
}

export interface ApiKeyStore {
  keys: Record<string, StoredApiKey>
}

const STORAGE_KEY = 'notedata-ai-api-keys'
const LEGACY_SETTINGS_KEY = 'notedata-ai-chat-settings'
const LEGACY_API_KEYS = ['notedata-legacy-api-key', 'notedata-poolside-api-key']

function createId(): string {
  return crypto.randomUUID()
}

function readStore(): ApiKeyStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { keys: {} }

    const parsed = JSON.parse(raw) as Partial<ApiKeyStore>
    const keys = parsed.keys && typeof parsed.keys === 'object' ? parsed.keys : {}
    const normalized: Record<string, StoredApiKey> = {}

    for (const [id, key] of Object.entries(keys)) {
      if (!key || typeof key !== 'object') continue
      const label = typeof key.label === 'string' ? key.label.trim() : ''
      const value = typeof key.value === 'string' ? key.value.trim() : ''
      if (!label || !value) continue
      normalized[id] = { id, label, value }
    }

    return { keys: normalized }
  } catch {
    return { keys: {} }
  }
}

function writeStore(store: ApiKeyStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function listApiKeys(): StoredApiKey[] {
  const store = readStore()
  return Object.values(store.keys).sort((a, b) => a.label.localeCompare(b.label))
}

export function getApiKeyById(id: string | null | undefined): StoredApiKey | null {
  if (!id) return null
  return readStore().keys[id] ?? null
}

export function getApiKeyValue(id: string | null | undefined): string {
  return getApiKeyById(id)?.value ?? ''
}

export function upsertApiKey(input: { id?: string; label: string; value: string }): StoredApiKey {
  const label = input.label.trim()
  const value = input.value.trim()
  if (!label) throw new Error('AI_API_KEY_LABEL_REQUIRED')
  if (!value) throw new Error('AI_API_KEY_VALUE_REQUIRED')

  const store = readStore()
  const id = input.id?.trim() || createId()
  const next: StoredApiKey = { id, label, value }
  store.keys[id] = next
  writeStore(store)
  return next
}

export function deleteApiKey(id: string) {
  const store = readStore()
  if (!(id in store.keys)) return
  delete store.keys[id]
  writeStore(store)
}

export function maskApiKey(apiKey: string): string {
  const trimmed = apiKey.trim()
  if (!trimmed) return ''
  if (trimmed.length <= 8) return '••••••••'
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`
}

export function migrateLegacyApiKeys(): StoredApiKey | null {
  const store = readStore()
  if (Object.keys(store.keys).length > 0) return null

  let legacyValue = ''

  try {
    const settingsRaw = localStorage.getItem(LEGACY_SETTINGS_KEY)
    if (settingsRaw) {
      const parsed = JSON.parse(settingsRaw) as { apiKey?: string }
      legacyValue = typeof parsed.apiKey === 'string' ? parsed.apiKey.trim() : ''
    }
  } catch {
    legacyValue = ''
  }

  if (!legacyValue) {
    for (const storageKey of LEGACY_API_KEYS) {
      const legacy = localStorage.getItem(storageKey)?.trim()
      if (legacy) {
        legacyValue = legacy
        localStorage.removeItem(storageKey)
        break
      }
    }
  }

  if (!legacyValue) return null

  return upsertApiKey({ label: 'Default', value: legacyValue })
}
import { get, onValue, ref, remove, set, type Unsubscribe } from 'firebase/database'
import { decryptContent, encryptContent, isEncryptedContent } from './crypto'
import { db } from './firebase'

export interface StoredApiKey {
  id: string
  label: string
  value: string
  keyId: string
  encrypted: boolean
  updatedAt: number
}

export interface ApiKeyStore {
  keys: Record<string, StoredApiKey>
}

function apiKeysPath(userId: string) {
  return `users/${userId}/settings/aiChatSettings/apiKeys`
}

export function parseStoredApiKey(id: string, raw: unknown): StoredApiKey | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const label = typeof record.label === 'string' ? record.label.trim() : ''
  const value = typeof record.value === 'string' ? record.value.trim() : ''
  const keyId = typeof record.keyId === 'string' ? record.keyId.trim() : ''
  if (!label || !value || !keyId) return null
  if (!isEncryptedContent(value)) return null

  return {
    id,
    label,
    value,
    keyId,
    encrypted: true,
    updatedAt: typeof record.updatedAt === 'number' ? record.updatedAt : Date.now(),
  }
}

function parseApiKeyStore(data: Record<string, unknown> | null | undefined): ApiKeyStore {
  if (!data) return { keys: {} }

  const keys: Record<string, StoredApiKey> = {}
  for (const [id, raw] of Object.entries(data)) {
    const parsed = parseStoredApiKey(id, raw)
    if (parsed) keys[id] = parsed
  }

  return { keys }
}

function serializeApiKey(key: StoredApiKey): Record<string, unknown> {
  return {
    label: key.label.trim(),
    value: key.value,
    keyId: key.keyId,
    encrypted: true,
    updatedAt: key.updatedAt,
  }
}

export function subscribeToApiKeys(
  userId: string,
  callback: (store: ApiKeyStore) => void,
): Unsubscribe {
  const keysRef = ref(db, apiKeysPath(userId))

  return onValue(keysRef, (snapshot) => {
    callback(parseApiKeyStore(snapshot.val()))
  })
}

export async function getApiKeys(userId: string): Promise<ApiKeyStore> {
  const snapshot = await get(ref(db, apiKeysPath(userId)))
  return parseApiKeyStore(snapshot.val())
}

export async function saveApiKey(userId: string, key: StoredApiKey): Promise<StoredApiKey> {
  const next: StoredApiKey = {
    ...key,
    label: key.label.trim(),
    encrypted: true,
    updatedAt: Date.now(),
  }
  await set(ref(db, `${apiKeysPath(userId)}/${next.id}`), serializeApiKey(next))
  return next
}

export async function deleteApiKey(userId: string, id: string): Promise<void> {
  await remove(ref(db, `${apiKeysPath(userId)}/${id}`))
}

export async function encryptApiKeyValue(
  plainValue: string,
  passcode: string,
  encryptionKeyId: string,
): Promise<string> {
  return encryptContent(plainValue.trim(), passcode, encryptionKeyId)
}

export async function decryptApiKeyValue(key: StoredApiKey, passcode: string): Promise<string> {
  if (!key.keyId) throw new Error('AI_API_KEY_MISSING_ENCRYPTION_KEY')
  return decryptContent(key.value, passcode, key.keyId)
}

export function maskApiKey(apiKey: string): string {
  const trimmed = apiKey.trim()
  if (!trimmed) return ''
  if (trimmed.length <= 8) return '••••••••'
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`
}

export function maskStoredApiKey(_key: StoredApiKey): string {
  return '••••••••'
}
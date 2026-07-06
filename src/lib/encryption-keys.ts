import type { EncryptionKey } from './types'

const STORAGE_KEY = 'notedata-encryption-keys'

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false

  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

async function hashPasscode(
  code: string,
  keyId: string,
  createdAt: number,
): Promise<string> {
  const encoder = new TextEncoder()
  const hmacKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${keyId}:${createdAt}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(code))
  return bytesToBase64(new Uint8Array(signature))
}

function readKeys(): EncryptionKey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as Array<Partial<EncryptionKey>>
    if (!Array.isArray(parsed)) return []

    return parsed.filter(
      (key): key is EncryptionKey =>
        typeof key.id === 'string' &&
        typeof key.label === 'string' &&
        typeof key.codeHash === 'string' &&
        typeof key.createdAt === 'number',
    )
  } catch {
    return []
  }
}

function writeKeys(keys: EncryptionKey[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
}

export function getEncryptionKeys(): EncryptionKey[] {
  return readKeys().sort((a, b) => b.createdAt - a.createdAt)
}

export function getEncryptionKey(keyId: string): EncryptionKey | null {
  return readKeys().find((key) => key.id === keyId) ?? null
}

export async function createEncryptionKey(label: string, code: string): Promise<EncryptionKey> {
  const keys = readKeys()
  const id = crypto.randomUUID()
  const createdAt = Date.now()
  const key: EncryptionKey = {
    id,
    label: label.trim() || `Key ${keys.length + 1}`,
    codeHash: await hashPasscode(code, id, createdAt),
    createdAt,
  }

  writeKeys([key, ...keys])
  return key
}

export function deleteEncryptionKey(keyId: string) {
  writeKeys(readKeys().filter((key) => key.id !== keyId))
}

export async function verifyEncryptionKeyCode(keyId: string, code: string): Promise<boolean> {
  const key = getEncryptionKey(keyId)
  if (!key) return false

  const candidate = await hashPasscode(code, key.id, key.createdAt)
  return timingSafeEqual(candidate, key.codeHash)
}

export function maskKeyCode(): string {
  return '••••••'
}
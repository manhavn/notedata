import type { EncryptionKey } from './types'

const STORAGE_KEY = 'notedata-encryption-keys'

function readKeys(): EncryptionKey[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw) as EncryptionKey[]
    return Array.isArray(parsed) ? parsed : []
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

export function createEncryptionKey(label: string, code: string): EncryptionKey {
  const keys = readKeys()
  const key: EncryptionKey = {
    id: crypto.randomUUID(),
    label: label.trim() || `Key ${keys.length + 1}`,
    code,
    createdAt: Date.now(),
  }

  writeKeys([key, ...keys])
  return key
}

export function deleteEncryptionKey(keyId: string) {
  writeKeys(readKeys().filter((key) => key.id !== keyId))
}

export function verifyEncryptionKeyCode(keyId: string, code: string): boolean {
  const key = getEncryptionKey(keyId)
  return key?.code === code
}

export function maskKeyCode(): string {
  return '••••••'
}
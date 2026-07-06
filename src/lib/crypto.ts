const ENCRYPTION_PREFIX = 'enc:v1:'

interface EncryptedPayload {
  iv: string
  data: string
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function deriveCryptoKey(passcode: string, keyId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passcode),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(`notedata-${keyId}`),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export function isEncryptedContent(content: string): boolean {
  return content.startsWith(ENCRYPTION_PREFIX)
}

export function isNoteEncrypted(note: { encrypted?: boolean; content: string }): boolean {
  return Boolean(note.encrypted) || isEncryptedContent(note.content)
}

function packEncrypted(payload: EncryptedPayload): string {
  return `${ENCRYPTION_PREFIX}${JSON.stringify(payload)}`
}

function unpackEncrypted(content: string): EncryptedPayload {
  const raw = content.slice(ENCRYPTION_PREFIX.length)
  const parsed = JSON.parse(raw) as EncryptedPayload

  if (!parsed.iv || !parsed.data) {
    throw new Error('Invalid encrypted payload')
  }

  return parsed
}

export async function encryptContent(
  plainText: string,
  passcode: string,
  keyId: string,
): Promise<string> {
  const cryptoKey = await deriveCryptoKey(passcode, keyId)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plainText)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, encoded)

  return packEncrypted({
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted)),
  })
}

export async function decryptContent(
  encryptedContent: string,
  passcode: string,
  keyId: string,
): Promise<string> {
  const payload = unpackEncrypted(encryptedContent)
  const cryptoKey = await deriveCryptoKey(passcode, keyId)
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64ToBytes(payload.iv),
    },
    cryptoKey,
    base64ToBytes(payload.data),
  )

  return new TextDecoder().decode(decrypted)
}
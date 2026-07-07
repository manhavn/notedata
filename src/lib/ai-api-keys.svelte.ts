import { onAuthStateChanged } from 'firebase/auth'
import { aiChatSettingsState } from './ai-providers.svelte'
import { getApiKeys, type StoredApiKey } from './ai-api-keys'
import { auth } from './firebase'

export const apiKeyState = $state({
  unlockedApiKeyId: null as string | null,
  unlockedValue: '',
})

onAuthStateChanged(auth, (user) => {
  if (!user) {
    clearUnlockedApiKey()
  }
})

export function clearUnlockedApiKey() {
  apiKeyState.unlockedApiKeyId = null
  apiKeyState.unlockedValue = ''
}

export function setUnlockedApiKey(id: string, value: string) {
  apiKeyState.unlockedApiKeyId = id
  apiKeyState.unlockedValue = value.trim()
}

export function isApiKeyUnlocked(id: string | null | undefined): boolean {
  if (!id) return true
  return apiKeyState.unlockedApiKeyId === id && apiKeyState.unlockedValue.length > 0
}

export function getUnlockedApiKeyValue(id: string | null | undefined): string {
  if (!id) return ''
  if (!isApiKeyUnlocked(id)) return ''
  return apiKeyState.unlockedValue
}

export function listApiKeys(): StoredApiKey[] {
  return Object.values(aiChatSettingsState.settings.apiKeys).sort((a, b) =>
    a.label.localeCompare(b.label),
  )
}

export function getApiKeyById(id: string | null | undefined): StoredApiKey | null {
  if (!id) return null
  return aiChatSettingsState.settings.apiKeys[id] ?? null
}

export async function refreshApiKeys(userId: string) {
  const store = await getApiKeys(userId)
  aiChatSettingsState.settings = {
    ...aiChatSettingsState.settings,
    apiKeys: store.keys,
  }
}
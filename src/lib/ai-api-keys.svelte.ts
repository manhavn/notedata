import { onAuthStateChanged } from 'firebase/auth'
import { aiChatSettingsState } from './ai-providers.svelte'
import { getApiKeys, type StoredApiKey } from './ai-api-keys'
import { auth } from './firebase'

export const apiKeyState = $state({
  unlockedKeys: {} as Record<string, string>,
})

onAuthStateChanged(auth, (user) => {
  if (!user) {
    clearUnlockedApiKey()
  }
})

export function clearUnlockedApiKey(id?: string) {
  if (!id) {
    apiKeyState.unlockedKeys = {}
    return
  }

  if (!(id in apiKeyState.unlockedKeys)) return

  const { [id]: _removed, ...rest } = apiKeyState.unlockedKeys
  apiKeyState.unlockedKeys = rest
}

export function setUnlockedApiKey(id: string, value: string) {
  apiKeyState.unlockedKeys = {
    ...apiKeyState.unlockedKeys,
    [id]: value.trim(),
  }
}

export function isApiKeyUnlocked(id: string | null | undefined): boolean {
  if (!id) return true
  const value = apiKeyState.unlockedKeys[id]
  return typeof value === 'string' && value.length > 0
}

export function getUnlockedApiKeyValue(id: string | null | undefined): string {
  if (!id) return ''
  if (!isApiKeyUnlocked(id)) return ''
  return apiKeyState.unlockedKeys[id]
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
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import {
  getAiChatSettingsStore,
  subscribeToAiChatSettingsStore,
  type AiChatSettingsStore,
} from './ai-providers'
import { bindAiChatSettingsStoreGetter } from './ai-settings'

const EMPTY_SETTINGS: AiChatSettingsStore = {
  activeProviderId: null,
  activeModelId: null,
  activeApiKeyId: null,
  providers: {},
  models: {},
  apiKeys: {},
}

export const aiChatSettingsState = $state({
  settings: { ...EMPTY_SETTINGS } as AiChatSettingsStore,
  loaded: false,
})

let unsubscribe: (() => void) | null = null

bindAiChatSettingsStoreGetter(() => aiChatSettingsState.settings)

function bindAiChatSettings(userId: string | null) {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }

  if (!userId) {
    aiChatSettingsState.settings = { ...EMPTY_SETTINGS }
    aiChatSettingsState.loaded = false
    return
  }

  unsubscribe = subscribeToAiChatSettingsStore(userId, (settings) => {
    aiChatSettingsState.settings = settings
    aiChatSettingsState.loaded = true
  })
}

onAuthStateChanged(auth, (user) => {
  bindAiChatSettings(user?.uid ?? null)
})

export function getAiChatSettingsState(): AiChatSettingsStore {
  return aiChatSettingsState.settings
}

export async function refreshAiChatSettings(userId: string) {
  aiChatSettingsState.settings = await getAiChatSettingsStore(userId)
  aiChatSettingsState.loaded = true
}
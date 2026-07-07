import { onAuthStateChanged } from 'firebase/auth'
import { getLegacyAiChatSettingsFromStorage, resetAiChatSettings } from './ai-settings'
import { migrateLegacyApiKeys } from './ai-api-keys'
import { auth } from './firebase'
import {
  getAiProviderSettings,
  migrateLegacyProviderSettings,
  subscribeToAiProviderSettings,
  type AiProviderSettings,
} from './ai-providers'
import { bindAiProviderSettingsGetter } from './ai-settings'

const EMPTY_SETTINGS: AiProviderSettings = {
  activeProviderId: null,
  activeModelId: null,
  providers: {},
  models: {},
}

export const aiProviderState = $state({
  settings: { ...EMPTY_SETTINGS } as AiProviderSettings,
  loaded: false,
  migrating: false,
})

let unsubscribe: (() => void) | null = null
let migrationStarted = false

bindAiProviderSettingsGetter(() => aiProviderState.settings)

function bindProviderSettings(userId: string | null) {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }

  if (!userId) {
    aiProviderState.settings = { ...EMPTY_SETTINGS }
    aiProviderState.loaded = false
    aiProviderState.migrating = false
    migrationStarted = false
    return
  }

  unsubscribe = subscribeToAiProviderSettings(userId, (settings) => {
    aiProviderState.settings = settings
    aiProviderState.loaded = true
    void maybeMigrateLegacySettings(userId, settings)
  })
}

async function maybeMigrateLegacySettings(userId: string, settings: AiProviderSettings) {
  if (migrationStarted || Object.keys(settings.providers).length > 0) return
  migrationStarted = true
  aiProviderState.migrating = true

  try {
    const apiKey = migrateLegacyApiKeys()
    const legacy = getLegacyAiChatSettingsFromStorage()
    const hasLegacy =
      legacy.completionsUrl.trim().length > 0 || legacy.model.trim().length > 0 || legacy.apiKey.trim()

    if (!hasLegacy) return
    await migrateLegacyProviderSettings(userId, legacy, apiKey?.id ?? null)
    resetAiChatSettings()
  } catch {
    // Migration is best-effort; user can configure providers manually.
  } finally {
    aiProviderState.migrating = false
  }
}

onAuthStateChanged(auth, (user) => {
  bindProviderSettings(user?.uid ?? null)
})

export function getAiProviderSettingsState(): AiProviderSettings {
  return aiProviderState.settings
}

export async function refreshAiProviderSettings(userId: string) {
  aiProviderState.settings = await getAiProviderSettings(userId)
  aiProviderState.loaded = true
}
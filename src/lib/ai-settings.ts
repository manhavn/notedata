import { getUnlockedApiKeyValue } from './ai-api-keys.svelte'
import {
  getActiveModel,
  getActiveProvider,
  providerToChatSettings,
  type AiChatSettingsStore,
} from './ai-providers'
import {
  isAiActiveSelectionValid,
  type AiActiveSelection,
  withStoreActiveSelection,
} from './note-ai-selection'

export interface AiChatSettings {
  completionsUrl: string
  apiKey: string
  authHeaderName: string
  authHeaderPrefix: string
  model: string
  systemPrompt: string
  temperature: number | null
  maxTokens: number | null
  topP: number | null
  frequencyPenalty: number | null
  presencePenalty: number | null
  stream: boolean
  extraHeaders: string
  extraBody: string
}

const EMPTY_AI_CHAT_SETTINGS_STORE: AiChatSettingsStore = {
  activeProviderId: null,
  activeModelId: null,
  activeApiKeyId: null,
  providers: {},
  models: {},
  apiKeys: {},
}

let getAiChatSettingsStore: () => AiChatSettingsStore = () => EMPTY_AI_CHAT_SETTINGS_STORE

export function bindAiChatSettingsStoreGetter(getter: () => AiChatSettingsStore) {
  getAiChatSettingsStore = getter
}

export const DEFAULT_AI_SETTINGS: AiChatSettings = {
  completionsUrl: '',
  apiKey: '',
  authHeaderName: 'Authorization',
  authHeaderPrefix: 'Bearer ',
  model: '',
  systemPrompt: [
    'You are a helpful writing assistant embedded in a personal notes app.',
    'Help the user draft, edit, summarize, or expand their note content.',
    'Respond in the same language the user writes in.',
    'Use markdown when it improves readability.',
    '',
    'Note title: {{noteTitle}}',
    'Current note content:',
    '{{noteContent}}',
  ].join('\n'),
  temperature: null,
  maxTokens: null,
  topP: null,
  frequencyPenalty: null,
  presencePenalty: null,
  stream: false,
  extraHeaders: '{}',
  extraBody: '{}',
}

export function getAiChatSettingsForSelection(
  store: AiChatSettingsStore,
  selection: AiActiveSelection,
): AiChatSettings {
  const scopedStore = withStoreActiveSelection(store, selection)
  const provider = getActiveProvider(scopedStore)

  if (!provider) {
    return { ...DEFAULT_AI_SETTINGS }
  }

  const apiKey = getUnlockedApiKeyValue(selection.apiKeyId)
  return providerToChatSettings(provider, apiKey, scopedStore, getActiveModel(scopedStore))
}

export function getAiChatSettings(): AiChatSettings {
  const settings = getAiChatSettingsStore()
  return getAiChatSettingsForSelection(settings, {
    providerId: settings.activeProviderId,
    modelId: settings.activeModelId,
    apiKeyId: settings.activeApiKeyId,
  })
}

export function hasAiChatSettingsForSelection(
  store: AiChatSettingsStore,
  selection: AiActiveSelection,
): boolean {
  return isAiActiveSelectionValid(store, selection)
}

export function hasAiChatSettingsSaved(): boolean {
  const settings = getAiChatSettingsStore()
  return hasAiChatSettingsForSelection(settings, {
    providerId: settings.activeProviderId,
    modelId: settings.activeModelId,
    apiKeyId: settings.activeApiKeyId,
  })
}

export function isAiChatConfigured(): boolean {
  return hasAiChatSettingsSaved()
}

export { maskApiKey } from './ai-api-keys'

export function buildCompletionsUrl(settings: AiChatSettings): string {
  return settings.completionsUrl.trim()
}

export function renderSystemPrompt(
  template: string,
  context: { noteTitle: string; noteContent: string },
): string {
  return template
    .replaceAll('{{noteTitle}}', context.noteTitle.trim())
    .replaceAll('{{noteContent}}', context.noteContent.trim())
}

export function parseJsonObject(value: string, fieldLabel: string): Record<string, unknown> {
  const trimmed = value.trim()
  if (!trimmed) return {}

  const parsed = JSON.parse(trimmed) as unknown
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${fieldLabel} must be a JSON object`)
  }

  return parsed as Record<string, unknown>
}

export function validateAiChatSettings(settings: AiChatSettings): string | null {
  if (!settings.completionsUrl.trim()) return 'AI_SETTINGS_COMPLETIONS_URL_REQUIRED'
  if (!settings.model.trim()) return 'AI_SETTINGS_MODEL_REQUIRED'
  if (!settings.authHeaderName.trim()) return 'AI_SETTINGS_AUTH_HEADER_REQUIRED'

  try {
    new URL(settings.completionsUrl.trim())
  } catch {
    return 'AI_SETTINGS_COMPLETIONS_URL_INVALID'
  }

  try {
    parseJsonObject(settings.extraHeaders, 'extraHeaders')
    parseJsonObject(settings.extraBody, 'extraBody')
  } catch {
    return 'AI_SETTINGS_INVALID_JSON'
  }

  return null
}

export function cloneAiChatSettings(settings: AiChatSettings): AiChatSettings {
  return { ...settings }
}
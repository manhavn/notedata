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

type LegacyAiChatSettings = Partial<AiChatSettings> & {
  providerName?: string
  baseUrl?: string
  completionsPath?: string
}

const STORAGE_KEY = 'notedata-ai-chat-settings'
const LEGACY_API_KEYS = ['notedata-legacy-api-key', 'notedata-poolside-api-key']

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

function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function resolveCompletionsUrl(raw: LegacyAiChatSettings): string {
  if (typeof raw.completionsUrl === 'string' && raw.completionsUrl.trim()) {
    return raw.completionsUrl.trim()
  }

  const baseUrl = typeof raw.baseUrl === 'string' ? raw.baseUrl.trim().replace(/\/+$/, '') : ''
  const completionsPath =
    typeof raw.completionsPath === 'string' ? raw.completionsPath.trim() : ''

  if (!baseUrl && !completionsPath) return ''
  if (baseUrl && completionsPath) {
    const path = completionsPath.startsWith('/') ? completionsPath : `/${completionsPath}`
    return `${baseUrl}${path}`
  }

  return baseUrl || completionsPath
}

function normalizeSettings(raw: LegacyAiChatSettings): AiChatSettings {
  return {
    completionsUrl: resolveCompletionsUrl(raw),
    apiKey: typeof raw.apiKey === 'string' ? raw.apiKey.trim() : '',
    authHeaderName:
      typeof raw.authHeaderName === 'string' && raw.authHeaderName.trim()
        ? raw.authHeaderName.trim()
        : DEFAULT_AI_SETTINGS.authHeaderName,
    authHeaderPrefix: typeof raw.authHeaderPrefix === 'string' ? raw.authHeaderPrefix : DEFAULT_AI_SETTINGS.authHeaderPrefix,
    model: typeof raw.model === 'string' ? raw.model.trim() : DEFAULT_AI_SETTINGS.model,
    systemPrompt:
      typeof raw.systemPrompt === 'string' && raw.systemPrompt.trim()
        ? raw.systemPrompt
        : DEFAULT_AI_SETTINGS.systemPrompt,
    temperature: parseOptionalNumber(raw.temperature),
    maxTokens: parseOptionalNumber(raw.maxTokens),
    topP: parseOptionalNumber(raw.topP),
    frequencyPenalty: parseOptionalNumber(raw.frequencyPenalty),
    presencePenalty: parseOptionalNumber(raw.presencePenalty),
    stream: Boolean(raw.stream),
    extraHeaders:
      typeof raw.extraHeaders === 'string' && raw.extraHeaders.trim()
        ? raw.extraHeaders
        : DEFAULT_AI_SETTINGS.extraHeaders,
    extraBody:
      typeof raw.extraBody === 'string' && raw.extraBody.trim() ? raw.extraBody : DEFAULT_AI_SETTINGS.extraBody,
  }
}

function migrateLegacyApiKey(settings: AiChatSettings): AiChatSettings {
  try {
    if (settings.apiKey) return settings

    for (const storageKey of LEGACY_API_KEYS) {
      const legacy = localStorage.getItem(storageKey)?.trim()
      if (!legacy) continue

      localStorage.removeItem(storageKey)
      return { ...settings, apiKey: legacy }
    }

    return settings
  } catch {
    return settings
  }
}

function readSettings(): AiChatSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return migrateLegacyApiKey(DEFAULT_AI_SETTINGS)
    }

    const parsed = JSON.parse(raw) as LegacyAiChatSettings
    return migrateLegacyApiKey(normalizeSettings(parsed))
  } catch {
    return migrateLegacyApiKey(DEFAULT_AI_SETTINGS)
  }
}

export function getAiChatSettings(): AiChatSettings {
  return readSettings()
}

export function saveAiChatSettings(settings: AiChatSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSettings(settings)))
}

export function resetAiChatSettings(): AiChatSettings {
  localStorage.removeItem(STORAGE_KEY)
  for (const storageKey of LEGACY_API_KEYS) {
    localStorage.removeItem(storageKey)
  }
  return { ...DEFAULT_AI_SETTINGS }
}

export function hasAiChatSettingsSaved(): boolean {
  const settings = readSettings()
  return Boolean(settings.completionsUrl.trim() && settings.model.trim())
}

export function isAiChatConfigured(): boolean {
  const settings = readSettings()
  return Boolean(settings.apiKey && hasAiChatSettingsSaved())
}

export function maskApiKey(apiKey: string): string {
  const trimmed = apiKey.trim()
  if (!trimmed) return ''
  if (trimmed.length <= 8) return '••••••••'
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`
}

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
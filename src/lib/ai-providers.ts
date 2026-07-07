import { get, onValue, ref, remove, set, update, type Unsubscribe } from 'firebase/database'
import { parseStoredApiKey, type StoredApiKey } from './ai-api-keys'
import { DEFAULT_AI_SETTINGS, type AiChatSettings } from './ai-settings'
import { db } from './firebase'

export const AI_CHAT_SETTINGS_KEY = 'aiChatSettings'

export interface AiProviderModel {
  id: string
  label: string
  value: string
  updatedAt?: number
}

export interface AiProvider {
  id: string
  name: string
  completionsUrl: string
  authHeaderName: string
  authHeaderPrefix: string
  systemPrompt: string
  temperature: number | null
  maxTokens: number | null
  topP: number | null
  frequencyPenalty: number | null
  presencePenalty: number | null
  stream: boolean
  extraHeaders: string
  extraBody: string
  updatedAt: number
}

export interface AiChatSettingsStore {
  activeProviderId: string | null
  activeModelId: string | null
  activeApiKeyId: string | null
  providers: Record<string, AiProvider>
  models: Record<string, AiProviderModel>
  apiKeys: Record<string, StoredApiKey>
}

const EMPTY_SETTINGS: AiChatSettingsStore = {
  activeProviderId: null,
  activeModelId: null,
  activeApiKeyId: null,
  providers: {},
  models: {},
  apiKeys: {},
}

export function aiChatSettingsPath(userId: string) {
  return `users/${userId}/settings/${AI_CHAT_SETTINGS_KEY}`
}

function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseModel(id: string, raw: unknown): AiProviderModel | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const label = typeof record.label === 'string' ? record.label.trim() : ''
  const value = typeof record.value === 'string' ? record.value.trim() : ''
  if (!label || !value) return null
  return {
    id,
    label,
    value,
    updatedAt: typeof record.updatedAt === 'number' ? record.updatedAt : undefined,
  }
}

function parseProvider(
  id: string,
  raw: unknown,
  models: Record<string, AiProviderModel>,
): { provider: AiProvider; legacyActiveModelId: string | null } | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Record<string, unknown>
  const name = typeof record.name === 'string' ? record.name.trim() : ''
  const completionsUrl = typeof record.completionsUrl === 'string' ? record.completionsUrl.trim() : ''
  if (!name || !completionsUrl) return null

  if (record.models && typeof record.models === 'object') {
    for (const [modelId, modelRaw] of Object.entries(record.models)) {
      const model = parseModel(modelId, modelRaw)
      if (model && !(modelId in models)) {
        models[modelId] = model
      }
    }
  }

  const legacyActiveModelId =
    typeof record.activeModelId === 'string' && record.activeModelId in models
      ? record.activeModelId
      : null

  return {
    provider: {
      id,
      name,
      completionsUrl,
      authHeaderName:
        typeof record.authHeaderName === 'string' && record.authHeaderName.trim()
          ? record.authHeaderName.trim()
          : DEFAULT_AI_SETTINGS.authHeaderName,
      authHeaderPrefix:
        typeof record.authHeaderPrefix === 'string'
          ? record.authHeaderPrefix
          : DEFAULT_AI_SETTINGS.authHeaderPrefix,
      systemPrompt:
        typeof record.systemPrompt === 'string' && record.systemPrompt.trim()
          ? record.systemPrompt
          : DEFAULT_AI_SETTINGS.systemPrompt,
      temperature: parseOptionalNumber(record.temperature),
      maxTokens: parseOptionalNumber(record.maxTokens),
      topP: parseOptionalNumber(record.topP),
      frequencyPenalty: parseOptionalNumber(record.frequencyPenalty),
      presencePenalty: parseOptionalNumber(record.presencePenalty),
      stream: Boolean(record.stream),
      extraHeaders:
        typeof record.extraHeaders === 'string' && record.extraHeaders.trim()
          ? record.extraHeaders
          : DEFAULT_AI_SETTINGS.extraHeaders,
      extraBody:
        typeof record.extraBody === 'string' && record.extraBody.trim()
          ? record.extraBody
          : DEFAULT_AI_SETTINGS.extraBody,
      updatedAt: typeof record.updatedAt === 'number' ? record.updatedAt : Date.now(),
    },
    legacyActiveModelId,
  }
}

function parseAiChatSettingsStore(data: Record<string, unknown> | null | undefined): AiChatSettingsStore {
  if (!data) return { ...EMPTY_SETTINGS }

  const models: Record<string, AiProviderModel> = {}
  if (data.models && typeof data.models === 'object') {
    for (const [id, raw] of Object.entries(data.models)) {
      const model = parseModel(id, raw)
      if (model) models[id] = model
    }
  }

  const providers: Record<string, AiProvider> = {}
  let legacyActiveModelId: string | null = null

  if (data.providers && typeof data.providers === 'object') {
    for (const [id, raw] of Object.entries(data.providers)) {
      const parsed = parseProvider(id, raw, models)
      if (!parsed) continue
      providers[id] = parsed.provider
      if (!legacyActiveModelId && parsed.legacyActiveModelId) {
        legacyActiveModelId = parsed.legacyActiveModelId
      }
    }
  }

  const activeProviderId =
    typeof data.activeProviderId === 'string' && data.activeProviderId in providers
      ? data.activeProviderId
      : null

  const activeModelId =
    typeof data.activeModelId === 'string' && data.activeModelId in models
      ? data.activeModelId
      : legacyActiveModelId && legacyActiveModelId in models
        ? legacyActiveModelId
        : null

  const apiKeys: Record<string, StoredApiKey> = {}
  if (data.apiKeys && typeof data.apiKeys === 'object') {
    for (const [id, raw] of Object.entries(data.apiKeys)) {
      const parsed = parseStoredApiKey(id, raw)
      if (parsed) apiKeys[id] = parsed
    }
  }

  const activeApiKeyId =
    typeof data.activeApiKeyId === 'string' &&
    data.activeApiKeyId.trim() &&
    data.activeApiKeyId.trim() in apiKeys
      ? data.activeApiKeyId.trim()
      : null

  return { activeProviderId, activeModelId, activeApiKeyId, providers, models, apiKeys }
}

export function createProviderId(): string {
  return crypto.randomUUID()
}

export function createModelId(): string {
  return crypto.randomUUID()
}

export function createDefaultProvider(name = 'New provider'): AiProvider {
  return {
    id: createProviderId(),
    name,
    completionsUrl: '',
    authHeaderName: DEFAULT_AI_SETTINGS.authHeaderName,
    authHeaderPrefix: DEFAULT_AI_SETTINGS.authHeaderPrefix,
    systemPrompt: DEFAULT_AI_SETTINGS.systemPrompt,
    temperature: null,
    maxTokens: null,
    topP: null,
    frequencyPenalty: null,
    presencePenalty: null,
    stream: false,
    extraHeaders: DEFAULT_AI_SETTINGS.extraHeaders,
    extraBody: DEFAULT_AI_SETTINGS.extraBody,
    updatedAt: Date.now(),
  }
}

export function cloneAiProvider(provider: AiProvider): AiProvider {
  return { ...provider }
}

export function listProviders(settings: AiChatSettingsStore): AiProvider[] {
  return Object.values(settings.providers).sort((a, b) => a.name.localeCompare(b.name))
}

export function listModels(settings: AiChatSettingsStore): AiProviderModel[] {
  return Object.values(settings.models).sort((a, b) => a.label.localeCompare(b.label))
}

export function getProviderById(
  settings: AiChatSettingsStore,
  id: string | null | undefined,
): AiProvider | null {
  if (!id) return null
  return settings.providers[id] ?? null
}

export function getModelById(
  settings: AiChatSettingsStore,
  id: string | null | undefined,
): AiProviderModel | null {
  if (!id) return null
  return settings.models[id] ?? null
}

export function getActiveProvider(settings: AiChatSettingsStore): AiProvider | null {
  return getProviderById(settings, settings.activeProviderId)
}

export function getActiveModel(settings: AiChatSettingsStore): AiProviderModel | null {
  if (!settings.activeModelId) return null
  return settings.models[settings.activeModelId] ?? null
}

export function providerToChatSettings(
  provider: AiProvider,
  apiKey: string,
  settings: AiChatSettingsStore,
  model?: AiProviderModel | null,
): AiChatSettings {
  const activeModel = model ?? getActiveModel(settings)
  return {
    completionsUrl: provider.completionsUrl,
    apiKey,
    authHeaderName: provider.authHeaderName,
    authHeaderPrefix: provider.authHeaderPrefix,
    model: activeModel?.value ?? '',
    systemPrompt: provider.systemPrompt,
    temperature: provider.temperature,
    maxTokens: provider.maxTokens,
    topP: provider.topP,
    frequencyPenalty: provider.frequencyPenalty,
    presencePenalty: provider.presencePenalty,
    stream: provider.stream,
    extraHeaders: provider.extraHeaders,
    extraBody: provider.extraBody,
  }
}

export function applyChatSettingsToProvider(
  provider: AiProvider,
  settings: AiChatSettings,
): AiProvider {
  const next = cloneAiProvider(provider)
  next.completionsUrl = settings.completionsUrl
  next.authHeaderName = settings.authHeaderName
  next.authHeaderPrefix = settings.authHeaderPrefix
  next.systemPrompt = settings.systemPrompt
  next.temperature = settings.temperature
  next.maxTokens = settings.maxTokens
  next.topP = settings.topP
  next.frequencyPenalty = settings.frequencyPenalty
  next.presencePenalty = settings.presencePenalty
  next.stream = settings.stream
  next.extraHeaders = settings.extraHeaders
  next.extraBody = settings.extraBody
  return next
}

export function validateAiProvider(provider: AiProvider): string | null {
  if (!provider.name.trim()) return 'AI_PROVIDER_NAME_REQUIRED'
  if (!provider.completionsUrl.trim()) return 'AI_SETTINGS_COMPLETIONS_URL_REQUIRED'

  try {
    new URL(provider.completionsUrl.trim())
  } catch {
    return 'AI_SETTINGS_COMPLETIONS_URL_INVALID'
  }

  if (!provider.authHeaderName.trim()) return 'AI_SETTINGS_AUTH_HEADER_REQUIRED'

  try {
    JSON.parse(provider.extraHeaders.trim() || '{}')
    JSON.parse(provider.extraBody.trim() || '{}')
  } catch {
    return 'AI_SETTINGS_INVALID_JSON'
  }

  return null
}

function serializeProvider(provider: AiProvider): Record<string, unknown> {
  return {
    name: provider.name.trim(),
    completionsUrl: provider.completionsUrl.trim(),
    authHeaderName: provider.authHeaderName.trim(),
    authHeaderPrefix: provider.authHeaderPrefix,
    systemPrompt: provider.systemPrompt,
    temperature: provider.temperature,
    maxTokens: provider.maxTokens,
    topP: provider.topP,
    frequencyPenalty: provider.frequencyPenalty,
    presencePenalty: provider.presencePenalty,
    stream: provider.stream,
    extraHeaders: provider.extraHeaders,
    extraBody: provider.extraBody,
    updatedAt: provider.updatedAt,
  }
}

function serializeModel(model: AiProviderModel): Record<string, unknown> {
  return {
    label: model.label.trim(),
    value: model.value.trim(),
    updatedAt: model.updatedAt ?? Date.now(),
  }
}

export function subscribeToAiChatSettingsStore(
  userId: string,
  callback: (settings: AiChatSettingsStore) => void,
): Unsubscribe {
  const settingsRef = ref(db, aiChatSettingsPath(userId))

  return onValue(settingsRef, (snapshot) => {
    callback(parseAiChatSettingsStore(snapshot.val()))
  })
}

export async function getAiChatSettingsStore(userId: string): Promise<AiChatSettingsStore> {
  const snapshot = await get(ref(db, aiChatSettingsPath(userId)))
  return parseAiChatSettingsStore(snapshot.val())
}

export async function saveAiProvider(userId: string, provider: AiProvider): Promise<void> {
  const next = {
    ...serializeProvider(provider),
    updatedAt: Date.now(),
  }
  await set(ref(db, `${aiChatSettingsPath(userId)}/providers/${provider.id}`), next)
}

export async function saveAiModel(userId: string, model: AiProviderModel): Promise<void> {
  await set(ref(db, `${aiChatSettingsPath(userId)}/models/${model.id}`), serializeModel(model))
}

export async function deleteAiProvider(userId: string, providerId: string): Promise<void> {
  await remove(ref(db, `${aiChatSettingsPath(userId)}/providers/${providerId}`))

  const settings = await getAiChatSettingsStore(userId)
  if (settings.activeProviderId !== providerId) return

  const nextActiveId = Object.keys(settings.providers).find((id) => id !== providerId) ?? null
  await update(ref(db, aiChatSettingsPath(userId)), {
    activeProviderId: nextActiveId,
  })
}

export async function deleteAiModel(userId: string, modelId: string): Promise<void> {
  await remove(ref(db, `${aiChatSettingsPath(userId)}/models/${modelId}`))

  const settings = await getAiChatSettingsStore(userId)
  if (settings.activeModelId !== modelId) return

  const nextActiveModelId =
    Object.keys(settings.models).find((id) => id !== modelId) ?? null
  await update(ref(db, aiChatSettingsPath(userId)), {
    activeModelId: nextActiveModelId,
  })
}

export async function setActiveAiProvider(userId: string, providerId: string): Promise<void> {
  await update(ref(db, aiChatSettingsPath(userId)), {
    activeProviderId: providerId,
  })
}

export async function setActiveAiModel(userId: string, modelId: string): Promise<void> {
  await update(ref(db, aiChatSettingsPath(userId)), {
    activeModelId: modelId,
  })
}

export async function setActiveAiApiKey(userId: string, apiKeyId: string | null): Promise<void> {
  await update(ref(db, aiChatSettingsPath(userId)), {
    activeApiKeyId: apiKeyId,
  })
}
import { get, onValue, ref, remove, set, update, type Unsubscribe } from 'firebase/database'
import { DEFAULT_AI_SETTINGS, type AiChatSettings } from './ai-settings'
import { db } from './firebase'

export const AI_PROVIDER_SETTINGS_KEY = 'aiProviderSettings'

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
  apiKeyId: string | null
  updatedAt: number
}

export interface AiProviderSettings {
  activeProviderId: string | null
  activeModelId: string | null
  providers: Record<string, AiProvider>
  models: Record<string, AiProviderModel>
}

const EMPTY_SETTINGS: AiProviderSettings = {
  activeProviderId: null,
  activeModelId: null,
  providers: {},
  models: {},
}

function aiProviderSettingsPath(userId: string) {
  return `users/${userId}/settings/${AI_PROVIDER_SETTINGS_KEY}`
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
      apiKeyId: typeof record.apiKeyId === 'string' ? record.apiKeyId : null,
      updatedAt: typeof record.updatedAt === 'number' ? record.updatedAt : Date.now(),
    },
    legacyActiveModelId,
  }
}

function parseAiProviderSettings(data: Record<string, unknown> | null | undefined): AiProviderSettings {
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
      : Object.keys(providers)[0] ?? null

  const activeModelId =
    typeof data.activeModelId === 'string' && data.activeModelId in models
      ? data.activeModelId
      : legacyActiveModelId && legacyActiveModelId in models
        ? legacyActiveModelId
        : Object.keys(models)[0] ?? null

  return { activeProviderId, activeModelId, providers, models }
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
    apiKeyId: null,
    updatedAt: Date.now(),
  }
}

export function cloneAiProvider(provider: AiProvider): AiProvider {
  return { ...provider }
}

export function listProviders(settings: AiProviderSettings): AiProvider[] {
  return Object.values(settings.providers).sort((a, b) => a.name.localeCompare(b.name))
}

export function listModels(settings: AiProviderSettings): AiProviderModel[] {
  return Object.values(settings.models).sort((a, b) => a.label.localeCompare(b.label))
}

export function getProviderById(
  settings: AiProviderSettings,
  id: string | null | undefined,
): AiProvider | null {
  if (!id) return null
  return settings.providers[id] ?? null
}

export function getModelById(
  settings: AiProviderSettings,
  id: string | null | undefined,
): AiProviderModel | null {
  if (!id) return null
  return settings.models[id] ?? null
}

export function getActiveProvider(settings: AiProviderSettings): AiProvider | null {
  return getProviderById(settings, settings.activeProviderId)
}

export function getActiveModel(settings: AiProviderSettings): AiProviderModel | null {
  if (!settings.activeModelId) return null
  return settings.models[settings.activeModelId] ?? null
}

export function providerToChatSettings(
  provider: AiProvider,
  apiKey: string,
  settings: AiProviderSettings,
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
  allSettings: AiProviderSettings,
): {
  provider: AiProvider
  models: Record<string, AiProviderModel>
  activeModelId: string | null
} {
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

  const nextModels = { ...allSettings.models }
  let activeModelId = allSettings.activeModelId

  if (settings.model.trim()) {
    const existing = Object.values(nextModels).find((model) => model.value === settings.model.trim())
    if (existing) {
      activeModelId = existing.id
    } else {
      const modelId = createModelId()
      nextModels[modelId] = {
        id: modelId,
        label: settings.model.trim(),
        value: settings.model.trim(),
      }
      activeModelId = modelId
    }
  }

  return { provider: next, models: nextModels, activeModelId }
}

export function buildProviderFromLegacySettings(
  settings: AiChatSettings,
  apiKeyId: string | null,
  name = 'Imported provider',
): { provider: AiProvider; model: AiProviderModel | null; activeModelId: string | null } {
  const provider = createDefaultProvider(name)
  provider.completionsUrl = settings.completionsUrl
  provider.authHeaderName = settings.authHeaderName
  provider.authHeaderPrefix = settings.authHeaderPrefix
  provider.systemPrompt = settings.systemPrompt
  provider.temperature = settings.temperature
  provider.maxTokens = settings.maxTokens
  provider.topP = settings.topP
  provider.frequencyPenalty = settings.frequencyPenalty
  provider.presencePenalty = settings.presencePenalty
  provider.stream = settings.stream
  provider.extraHeaders = settings.extraHeaders
  provider.extraBody = settings.extraBody
  provider.apiKeyId = apiKeyId

  let model: AiProviderModel | null = null
  let activeModelId: string | null = null
  if (settings.model.trim()) {
    const modelId = createModelId()
    model = {
      id: modelId,
      label: settings.model.trim(),
      value: settings.model.trim(),
    }
    activeModelId = modelId
  }

  return { provider, model, activeModelId }
}

export function validateAiProvider(
  provider: AiProvider,
  settings: AiProviderSettings,
): string | null {
  if (!provider.name.trim()) return 'AI_PROVIDER_NAME_REQUIRED'
  if (!provider.completionsUrl.trim()) return 'AI_SETTINGS_COMPLETIONS_URL_REQUIRED'

  try {
    new URL(provider.completionsUrl.trim())
  } catch {
    return 'AI_SETTINGS_COMPLETIONS_URL_INVALID'
  }

  if (!provider.authHeaderName.trim()) return 'AI_SETTINGS_AUTH_HEADER_REQUIRED'
  if (!settings.activeModelId || !settings.models[settings.activeModelId]) {
    return 'AI_PROVIDER_MODEL_REQUIRED'
  }

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
    apiKeyId: provider.apiKeyId,
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

export function subscribeToAiProviderSettings(
  userId: string,
  callback: (settings: AiProviderSettings) => void,
): Unsubscribe {
  const settingsRef = ref(db, aiProviderSettingsPath(userId))

  return onValue(settingsRef, (snapshot) => {
    callback(parseAiProviderSettings(snapshot.val()))
  })
}

export async function getAiProviderSettings(userId: string): Promise<AiProviderSettings> {
  const snapshot = await get(ref(db, aiProviderSettingsPath(userId)))
  return parseAiProviderSettings(snapshot.val())
}

export async function saveAiProvider(userId: string, provider: AiProvider): Promise<void> {
  const next = {
    ...serializeProvider(provider),
    updatedAt: Date.now(),
  }
  await set(ref(db, `${aiProviderSettingsPath(userId)}/providers/${provider.id}`), next)
}

export async function saveAiModel(userId: string, model: AiProviderModel): Promise<void> {
  await set(ref(db, `${aiProviderSettingsPath(userId)}/models/${model.id}`), serializeModel(model))
}

export async function deleteAiProvider(userId: string, providerId: string): Promise<void> {
  await remove(ref(db, `${aiProviderSettingsPath(userId)}/providers/${providerId}`))

  const settings = await getAiProviderSettings(userId)
  if (settings.activeProviderId !== providerId) return

  const nextActiveId = Object.keys(settings.providers).find((id) => id !== providerId) ?? null
  await update(ref(db, aiProviderSettingsPath(userId)), {
    activeProviderId: nextActiveId,
  })
}

export async function deleteAiModel(userId: string, modelId: string): Promise<void> {
  await remove(ref(db, `${aiProviderSettingsPath(userId)}/models/${modelId}`))

  const settings = await getAiProviderSettings(userId)
  if (settings.activeModelId !== modelId) return

  const nextActiveModelId =
    Object.keys(settings.models).find((id) => id !== modelId) ?? null
  await update(ref(db, aiProviderSettingsPath(userId)), {
    activeModelId: nextActiveModelId,
  })
}

export async function setActiveAiProvider(userId: string, providerId: string): Promise<void> {
  await update(ref(db, aiProviderSettingsPath(userId)), {
    activeProviderId: providerId,
  })
}

export async function setActiveAiModel(userId: string, modelId: string): Promise<void> {
  await update(ref(db, aiProviderSettingsPath(userId)), {
    activeModelId: modelId,
  })
}

export async function migrateLegacyProviderSettings(
  userId: string,
  legacySettings: AiChatSettings,
  apiKeyId: string | null,
): Promise<AiProviderSettings> {
  const { provider, model, activeModelId } = buildProviderFromLegacySettings(legacySettings, apiKeyId)
  if (model) {
    await saveAiModel(userId, model)
  }
  await saveAiProvider(userId, provider)
  await update(ref(db, aiProviderSettingsPath(userId)), {
    activeProviderId: provider.id,
    activeModelId,
  })
  return getAiProviderSettings(userId)
}
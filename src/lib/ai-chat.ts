import {
  buildCompletionsUrl,
  getAiChatSettings,
  isAiChatConfigured,
  parseJsonObject,
  type AiChatSettings,
} from './ai-settings'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  error?: {
    message?: string
  }
}

export { isAiChatConfigured }

function buildHeaders(settings: AiChatSettings): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...Object.fromEntries(
      Object.entries(parseJsonObject(settings.extraHeaders, 'extraHeaders')).map(([key, value]) => [
        key,
        String(value),
      ]),
    ),
  }

  if (settings.apiKey) {
    headers[settings.authHeaderName] = `${settings.authHeaderPrefix}${settings.apiKey}`
  }

  return headers
}

function buildRequestBody(settings: AiChatSettings, messages: ChatMessage[]): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: settings.model,
    messages,
    stream: settings.stream,
    ...parseJsonObject(settings.extraBody, 'extraBody'),
  }

  if (settings.temperature !== null) body.temperature = settings.temperature
  if (settings.maxTokens !== null) body.max_tokens = settings.maxTokens
  if (settings.topP !== null) body.top_p = settings.topP
  if (settings.frequencyPenalty !== null) body.frequency_penalty = settings.frequencyPenalty
  if (settings.presencePenalty !== null) body.presence_penalty = settings.presencePenalty

  return body
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: { signal?: AbortSignal },
): Promise<string> {
  const settings = getAiChatSettings()

  const response = await fetch(buildCompletionsUrl(settings), {
    method: 'POST',
    headers: buildHeaders(settings),
    signal: options?.signal,
    body: JSON.stringify(buildRequestBody(settings, messages)),
  })

  const payload = (await response.json()) as ChatCompletionResponse

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `AI API error (${response.status})`)
  }

  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('Empty response from AI API')
  }

  return content
}
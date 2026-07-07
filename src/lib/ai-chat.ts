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
    delta?: {
      content?: string
    }
  }>
  error?: {
    message?: string
  }
}

interface StreamChunk {
  choices?: Array<{
    delta?: { content?: string }
    message?: { content?: string }
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

function extractChunkContent(chunk: StreamChunk): string {
  const choice = chunk.choices?.[0]
  return choice?.delta?.content ?? choice?.message?.content ?? ''
}

function shouldReadAsStream(response: Response, streamRequested: boolean): boolean {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return false
  return streamRequested || contentType.includes('text/event-stream')
}

async function readJsonCompletion(response: Response): Promise<string> {
  const payload = (await response.json()) as ChatCompletionResponse
  const content = payload.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('Empty response from AI API')
  }
  return content
}

async function readStreamCompletion(
  response: Response,
  options?: { onChunk?: (content: string) => void },
): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Empty response from AI API')

  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''

  const processLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith(':') || !trimmed.startsWith('data:')) return

    const data = trimmed.slice(5).trim()
    if (!data || data === '[DONE]') return

    let chunk: StreamChunk
    try {
      chunk = JSON.parse(data) as StreamChunk
    } catch {
      return
    }

    if (chunk.error?.message) {
      throw new Error(chunk.error.message)
    }

    const delta = extractChunkContent(chunk)
    if (!delta) return

    content += delta
    options?.onChunk?.(content)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    let newlineIndex = buffer.indexOf('\n')
    while (newlineIndex !== -1) {
      processLine(buffer.slice(0, newlineIndex))
      buffer = buffer.slice(newlineIndex + 1)
      newlineIndex = buffer.indexOf('\n')
    }
  }

  if (buffer.trim()) {
    processLine(buffer)
  }

  return content.trim()
}

async function readErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const payload = (await response.json()) as ChatCompletionResponse
    return payload.error?.message ?? `AI API error (${response.status})`
  }

  const text = (await response.text()).trim()
  return text || `AI API error (${response.status})`
}

export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    signal?: AbortSignal
    onChunk?: (content: string) => void
    settings?: AiChatSettings
  },
): Promise<string> {
  const settings = options?.settings ?? getAiChatSettings()

  const response = await fetch(buildCompletionsUrl(settings), {
    method: 'POST',
    headers: buildHeaders(settings),
    signal: options?.signal,
    body: JSON.stringify(buildRequestBody(settings, messages)),
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const content = shouldReadAsStream(response, settings.stream)
    ? await readStreamCompletion(response, { onChunk: options?.onChunk })
    : await readJsonCompletion(response)

  if (!content) {
    throw new Error('Empty response from AI API')
  }

  return content
}
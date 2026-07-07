import {
  cloneAiChatSettings,
  DEFAULT_AI_SETTINGS,
  getAiChatSettings,
  type AiChatSettings,
} from './ai-settings'

const KNOWN_BODY_FIELDS = new Set([
  'model',
  'messages',
  'temperature',
  'max_tokens',
  'top_p',
  'frequency_penalty',
  'presence_penalty',
  'stream',
])

export interface CurlImportResult {
  settings: AiChatSettings
  apiKeyDraft: string
  warnings: string[]
}

function normalizeCurlInput(input: string): string {
  const lines = input.split(/\r?\n/)
  const parts: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.endsWith('\\')) {
      parts.push(trimmed.slice(0, -1).trim())
      continue
    }
    parts.push(trimmed)
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

function extractQuotedValue(input: string, startIndex: number): { value: string; endIndex: number } | null {
  const quote = input[startIndex]
  if (quote !== '"' && quote !== "'") return null

  let value = ''
  let index = startIndex + 1

  while (index < input.length) {
    const char = input[index]
    if (char === '\\' && index + 1 < input.length) {
      value += input[index + 1]
      index += 2
      continue
    }
    if (char === quote) {
      return { value, endIndex: index + 1 }
    }
    value += char
    index += 1
  }

  return null
}

function isEnvPlaceholder(value: string): boolean {
  const trimmed = value.trim()
  return /^\$[A-Z_][A-Z0-9_]*$/i.test(trimmed) || /^\$\{[A-Z_][A-Z0-9_]*\}$/i.test(trimmed)
}

function parseOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseAuthHeader(
  headerValue: string,
): { authHeaderName: string; authHeaderPrefix: string; apiKey: string } {
  const colonIndex = headerValue.indexOf(':')
  if (colonIndex === -1) {
    return {
      authHeaderName: 'Authorization',
      authHeaderPrefix: DEFAULT_AI_SETTINGS.authHeaderPrefix,
      apiKey: '',
    }
  }

  const authHeaderName = headerValue.slice(0, colonIndex).trim()
  const credential = headerValue.slice(colonIndex + 1).trim()

  const bearerMatch = credential.match(/^Bearer\s+(.+)$/i)
  if (bearerMatch) {
    const apiKey = bearerMatch[1].trim()
    return {
      authHeaderName,
      authHeaderPrefix: 'Bearer ',
      apiKey: isEnvPlaceholder(apiKey) ? '' : apiKey,
    }
  }

  return {
    authHeaderName,
    authHeaderPrefix: '',
    apiKey: isEnvPlaceholder(credential) ? '' : credential,
  }
}

function extractUrl(normalized: string): string | null {
  const explicit = normalized.match(/\b--url\s+(['"]?)([^\s'"]+)\1/i)
  if (explicit?.[2]) return explicit[2]

  const direct = normalized.match(/\bcurl\s+(?:-[A-Za-z]\s+\S+\s+)*['"]?(https?:\/\/[^\s'"]+)['"]?/i)
  if (direct?.[1]) return direct[1]

  const anywhere = normalized.match(/(https?:\/\/[^\s'"]+)/i)
  return anywhere?.[1] ?? null
}

function extractHeaders(normalized: string): string[] {
  const headers: string[] = []
  const flagPattern = /(?:^|\s)(?:-H|--header)\s+/gi
  let match: RegExpExecArray | null = flagPattern.exec(normalized)

  while (match) {
    const start = match.index + match[0].length
    const quoted = extractQuotedValue(normalized, start)
    if (quoted) {
      headers.push(quoted.value)
      flagPattern.lastIndex = quoted.endIndex
    } else {
      const rest = normalized.slice(start).trim()
      const unquoted = rest.match(/^(\S+)/)
      if (unquoted) {
        headers.push(unquoted[1])
        flagPattern.lastIndex = start + unquoted[0].length
      }
    }
    match = flagPattern.exec(normalized)
  }

  return headers
}

function extractBody(normalized: string): string | null {
  const flagPattern = /(?:^|\s)(?:-d|--data|--data-raw)\s+/gi
  const match = flagPattern.exec(normalized)
  if (!match) return null

  const start = match.index + match[0].length
  const quoted = extractQuotedValue(normalized, start)
  if (quoted) return quoted.value.trim()

  const rest = normalized.slice(start).trim()
  const braceStart = rest.indexOf('{')
  if (braceStart === -1) return rest.split(/\s+-/)[0]?.trim() ?? null

  let depth = 0
  for (let i = braceStart; i < rest.length; i += 1) {
    const char = rest[i]
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return rest.slice(braceStart, i + 1).trim()
      }
    }
  }

  return null
}

export function parseCurlToAiSettings(
  curlInput: string,
  current: AiChatSettings = getAiChatSettings(),
): CurlImportResult {
  const normalized = normalizeCurlInput(curlInput)
  if (!/\bcurl\b/i.test(normalized)) {
    throw new Error('AI_SETTINGS_CURL_INVALID')
  }

  const url = extractUrl(normalized)
  if (!url) {
    throw new Error('AI_SETTINGS_CURL_NO_URL')
  }

  const headers = extractHeaders(normalized)
  const warnings: string[] = []
  const extraHeaders: Record<string, string> = {}

  let authHeaderName = current.authHeaderName
  let authHeaderPrefix = current.authHeaderPrefix
  let apiKeyDraft = ''

  for (const header of headers) {
    const lower = header.toLowerCase()
    if (lower.startsWith('authorization:') || lower.startsWith('x-api-key:')) {
      const parsed = parseAuthHeader(header)
      authHeaderName = parsed.authHeaderName
      authHeaderPrefix = parsed.authHeaderPrefix
      if (parsed.apiKey) {
        apiKeyDraft = parsed.apiKey
      } else if (/\bauthorization:/i.test(header)) {
        warnings.push('AI_SETTINGS_CURL_ENV_KEY')
      }
      continue
    }

    if (lower.startsWith('content-type:')) continue

    const colonIndex = header.indexOf(':')
    if (colonIndex === -1) continue
    const name = header.slice(0, colonIndex).trim()
    const value = header.slice(colonIndex + 1).trim()
    if (name) extraHeaders[name] = value
  }

  const bodyRaw = extractBody(normalized)
  if (!bodyRaw) {
    throw new Error('AI_SETTINGS_CURL_NO_BODY')
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(bodyRaw) as Record<string, unknown>
  } catch {
    throw new Error('AI_SETTINGS_CURL_INVALID_JSON')
  }

  const extraBody: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(body)) {
    if (!KNOWN_BODY_FIELDS.has(key)) {
      extraBody[key] = value
    }
  }

  const settings = cloneAiChatSettings({
    ...current,
    completionsUrl: url,
    authHeaderName,
    authHeaderPrefix,
    apiKey: apiKeyDraft || current.apiKey,
    temperature: parseOptionalNumber(body.temperature),
    maxTokens: parseOptionalNumber(body.max_tokens),
    topP: parseOptionalNumber(body.top_p),
    frequencyPenalty: parseOptionalNumber(body.frequency_penalty),
    presencePenalty: parseOptionalNumber(body.presence_penalty),
    stream: Boolean(body.stream),
    extraHeaders: JSON.stringify(extraHeaders, null, 2),
    extraBody: JSON.stringify(extraBody, null, 2),
  })

  return { settings, apiKeyDraft, warnings }
}
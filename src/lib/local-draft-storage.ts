import type { NoteAiChatDraft } from './draft-ai-chat'

export const CHAT_DRAFT_LOCAL_PREFIX = 'chat_'
export const NOTE_DRAFT_LOCAL_PREFIX = 'note_'

export function chatLocalStorageKey(noteId: string): string {
  return `${CHAT_DRAFT_LOCAL_PREFIX}${noteId}`
}

export function noteLocalStorageKey(noteId: string): string {
  return `${NOTE_DRAFT_LOCAL_PREFIX}${noteId}`
}

export function listLocalStorageKeysByPrefix(prefix: string): string[] {
  if (typeof localStorage === 'undefined') return []

  const keys: string[] = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key?.startsWith(prefix)) keys.push(key)
  }

  return keys
}

export function countLocalStorageKeysByPrefix(prefix: string): number {
  return listLocalStorageKeysByPrefix(prefix).length
}

export function clearLocalStorageByPrefix(prefix: string): number {
  const keys = listLocalStorageKeysByPrefix(prefix)
  for (const key of keys) {
    removeKey(key)
  }
  return keys.length
}

function readJson<T>(key: string): T | undefined {
  if (typeof localStorage === 'undefined') return undefined

  try {
    const raw = localStorage.getItem(key)
    if (!raw) return undefined
    return JSON.parse(raw) as T
  } catch {
    return undefined
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore quota or private-mode errors.
  }
}

function removeKey(key: string): void {
  if (typeof localStorage === 'undefined') return

  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore storage errors.
  }
}

export function readChatDraftFromLocalStorage(noteId: string): NoteAiChatDraft | undefined {
  const draft = readJson<NoteAiChatDraft>(chatLocalStorageKey(noteId))
  if (!draft || !Array.isArray(draft.messages)) return undefined

  return {
    messages: draft.messages
      .filter(
        (message): message is NoteAiChatDraft['messages'][number] =>
          Boolean(message) &&
          typeof message.id === 'string' &&
          (message.role === 'user' || message.role === 'assistant') &&
          typeof message.content === 'string',
      )
      .map((message) => ({ ...message })),
    input: typeof draft.input === 'string' ? draft.input : '',
    open: draft.open === true,
  }
}

export function writeChatDraftToLocalStorage(noteId: string, draft: NoteAiChatDraft): void {
  writeJson(chatLocalStorageKey(noteId), {
    messages: draft.messages.map((message) => ({ ...message })),
    input: draft.input,
    open: draft.open,
  })
}

export function removeChatDraftFromLocalStorage(noteId: string): void {
  removeKey(chatLocalStorageKey(noteId))
}

export function readNoteDraftFromLocalStorage(noteId: string): string | undefined {
  const draft = readJson<{ content?: unknown }>(noteLocalStorageKey(noteId))
  if (!draft || typeof draft.content !== 'string') return undefined
  return draft.content
}

export function writeNoteDraftToLocalStorage(noteId: string, content: string): void {
  writeJson(noteLocalStorageKey(noteId), { content })
}

export function removeNoteDraftFromLocalStorage(noteId: string): void {
  removeKey(noteLocalStorageKey(noteId))
}
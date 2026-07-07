import { get, writable } from 'svelte/store'
import { chatCompletion, type ChatMessage } from './ai-chat'
import { aiChatSettingsState } from './ai-providers.svelte'
import { getAiChatSettingsForSelection, renderSystemPrompt } from './ai-settings'
import type { AiActiveSelection } from './note-ai-selection'
import {
  CHAT_DRAFT_LOCAL_PREFIX,
  clearLocalStorageByPrefix,
  listLocalStorageKeysByPrefix,
  readChatDraftFromLocalStorage,
  removeChatDraftFromLocalStorage,
  writeChatDraftToLocalStorage,
} from './local-draft-storage'
import { isPersistAiChatLocalEnabled } from './user-settings.svelte'

export interface AiChatUiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface NoteAiChatDraft {
  messages: AiChatUiMessage[]
  input: string
  open: boolean
  loading: boolean
  error: string | null
}

/** In-memory AI chat drafts keyed by note id. Cleared on explicit clear or page reload. */
export const draftAiChatStore = writable<Record<string, NoteAiChatDraft>>({})
export const aiChatDraftPurgeTick = writable(0)

const abortControllers = new Map<string, AbortController>()

export function createEmptyAiChatDraft(): NoteAiChatDraft {
  return {
    messages: [],
    input: '',
    open: false,
    loading: false,
    error: null,
  }
}

function cloneDraft(draft: NoteAiChatDraft): NoteAiChatDraft {
  return {
    messages: draft.messages.map((message) => ({ ...message })),
    input: draft.input,
    open: draft.open,
    loading: draft.loading,
    error: draft.error,
  }
}

function normalizeDraft(draft: Partial<NoteAiChatDraft> | undefined): NoteAiChatDraft {
  if (!draft) return createEmptyAiChatDraft()

  return {
    messages: Array.isArray(draft.messages)
      ? draft.messages
          .filter(
            (message): message is AiChatUiMessage =>
              Boolean(message) &&
              typeof message.id === 'string' &&
              (message.role === 'user' || message.role === 'assistant') &&
              typeof message.content === 'string',
          )
          .map((message) => ({ ...message }))
      : [],
    input: typeof draft.input === 'string' ? draft.input : '',
    open: draft.open === true,
    loading: draft.loading === true,
    error: typeof draft.error === 'string' ? draft.error : null,
  }
}

function shouldClearDraft(draft: NoteAiChatDraft): boolean {
  return (
    draft.messages.length === 0 &&
    !draft.input.trim() &&
    !draft.open &&
    !draft.loading
  )
}

function hasPersistableChatContent(draft: NoteAiChatDraft): boolean {
  return draft.messages.length > 0 || !!draft.input.trim() || draft.loading
}

function persistDraftIfNeeded(noteId: string, draft: NoteAiChatDraft) {
  if (shouldClearDraft(draft)) {
    draftAiChatStore.update((drafts) => {
      if (!(noteId in drafts)) return drafts
      const { [noteId]: _removed, ...rest } = drafts
      return rest
    })
    removeChatDraftFromLocalStorage(noteId)
    return
  }

  if (!hasPersistableChatContent(draft)) {
    removeChatDraftFromLocalStorage(noteId)
    return
  }

  if (isPersistAiChatLocalEnabled()) {
    writeChatDraftToLocalStorage(noteId, {
      messages: draft.messages.map((message) => ({ ...message })),
      input: draft.input,
      open: draft.open,
      loading: false,
      error: null,
    })
  }
}

export function getDraftAiChatSnapshot(noteId: string): NoteAiChatDraft {
  return cloneDraft(normalizeDraft(get(draftAiChatStore)[noteId]))
}

export function patchDraftAiChat(
  noteId: string,
  update:
    | Partial<NoteAiChatDraft>
    | ((draft: NoteAiChatDraft) => Partial<NoteAiChatDraft>),
) {
  let nextDraft = createEmptyAiChatDraft()

  draftAiChatStore.update((drafts) => {
    const current = normalizeDraft(drafts[noteId])
    const patch = typeof update === 'function' ? update(current) : update
    nextDraft = normalizeDraft({ ...current, ...patch })

    if (shouldClearDraft(nextDraft)) {
      const { [noteId]: _removed, ...rest } = drafts
      return rest
    }

    return {
      ...drafts,
      [noteId]: nextDraft,
    }
  })

  persistDraftIfNeeded(noteId, nextDraft)
}

export function loadDraftAiChat(noteId: string): NoteAiChatDraft | undefined {
  const inMemory = get(draftAiChatStore)[noteId]
  if (inMemory) return cloneDraft(normalizeDraft(inMemory))

  if (!isPersistAiChatLocalEnabled()) return undefined

  const localDraft = readChatDraftFromLocalStorage(noteId)
  if (!localDraft) return undefined

  const normalized = normalizeDraft(localDraft)
  draftAiChatStore.update((drafts) => ({
    ...drafts,
    [noteId]: normalized,
  }))

  return cloneDraft(normalized)
}

export function setDraftAiChat(noteId: string, draft: NoteAiChatDraft) {
  patchDraftAiChat(noteId, normalizeDraft(draft))
}

export function stopNoteAiChatGeneration(noteId: string) {
  abortControllers.get(noteId)?.abort()
  abortControllers.delete(noteId)
  patchDraftAiChat(noteId, { loading: false })
}

function abortAllNoteAiChatGenerations() {
  for (const controller of abortControllers.values()) {
    controller.abort()
  }
  abortControllers.clear()
}

export async function sendNoteAiChatMessage(
  noteId: string,
  options: {
    prompt: string
    noteTitle: string
    noteContent: string
    errorMessage: string
    activeSelection: AiActiveSelection
  },
) {
  const prompt = options.prompt.trim()
  if (!prompt) return

  const current = getDraftAiChatSnapshot(noteId)
  if (current.loading) return

  const userMessage: AiChatUiMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content: prompt,
  }

  const requestMessages = [...current.messages, userMessage]
  patchDraftAiChat(noteId, {
    messages: requestMessages,
    input: '',
    loading: true,
    error: null,
  })

  const controller = new AbortController()
  abortControllers.set(noteId, controller)

  const settings = getAiChatSettingsForSelection(
    aiChatSettingsState.settings,
    options.activeSelection,
  )
  const apiMessages: ChatMessage[] = [
    {
      role: 'system',
      content: renderSystemPrompt(settings.systemPrompt, {
        noteTitle: options.noteTitle,
        noteContent: options.noteContent,
      }),
    },
    ...requestMessages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ]

  const streamResponse = settings.stream
  const assistantId = crypto.randomUUID()

  if (streamResponse) {
    patchDraftAiChat(noteId, (draft) => ({
      messages: [...draft.messages, { id: assistantId, role: 'assistant', content: '' }],
    }))
  }

  try {
    const reply = await chatCompletion(apiMessages, {
      signal: controller.signal,
      settings,
      onChunk: streamResponse
        ? (content) => {
            patchDraftAiChat(noteId, (draft) => ({
              messages: draft.messages.map((message) =>
                message.id === assistantId ? { ...message, content } : message,
              ),
            }))
          }
        : undefined,
    })

    if (streamResponse) {
      patchDraftAiChat(noteId, (draft) => ({
        messages: draft.messages.map((message) =>
          message.id === assistantId ? { ...message, content: reply } : message,
        ),
      }))
    } else {
      patchDraftAiChat(noteId, (draft) => ({
        messages: [
          ...draft.messages,
          {
            id: assistantId,
            role: 'assistant',
            content: reply,
          },
        ],
      }))
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (streamResponse) {
        patchDraftAiChat(noteId, (draft) => ({
          messages: draft.messages.filter(
            (message) => message.id !== assistantId || message.content.trim(),
          ),
        }))
      }
      return
    }

    patchDraftAiChat(noteId, (draft) => ({
      error: err instanceof Error ? err.message : options.errorMessage,
      messages: draft.messages.filter(
        (message) => message.id !== userMessage.id && message.id !== assistantId,
      ),
      input: prompt,
    }))
  } finally {
    if (abortControllers.get(noteId) === controller) {
      abortControllers.delete(noteId)
    }
    patchDraftAiChat(noteId, { loading: false })
  }
}

export function clearDraftAiChat(noteId: string) {
  stopNoteAiChatGeneration(noteId)
  draftAiChatStore.update((drafts) => {
    if (!(noteId in drafts)) return drafts
    const { [noteId]: _removed, ...rest } = drafts
    return rest
  })
  removeChatDraftFromLocalStorage(noteId)
}

export function clearDraftAiChats(noteIds: string[]) {
  if (noteIds.length === 0) return
  for (const id of noteIds) {
    stopNoteAiChatGeneration(id)
  }
  draftAiChatStore.update((drafts) => {
    const next = { ...drafts }
    for (const id of noteIds) {
      delete next[id]
    }
    return next
  })
  for (const id of noteIds) {
    removeChatDraftFromLocalStorage(id)
  }
}

export function hasDraftAiChat(noteId: string): boolean {
  return loadDraftAiChat(noteId) !== undefined
}

export function getDraftAiChat(noteId: string): NoteAiChatDraft | undefined {
  return loadDraftAiChat(noteId)
}

export function countAiChatDrafts(): number {
  const noteIds = new Set<string>()
  for (const [noteId, draft] of Object.entries(get(draftAiChatStore))) {
    if (hasPersistableChatContent(normalizeDraft(draft))) {
      noteIds.add(noteId)
    }
  }
  for (const key of listLocalStorageKeysByPrefix(CHAT_DRAFT_LOCAL_PREFIX)) {
    noteIds.add(key.slice(CHAT_DRAFT_LOCAL_PREFIX.length))
  }
  return noteIds.size
}

export function purgeAllAiChatDrafts(): number {
  const count = countAiChatDrafts()
  abortAllNoteAiChatGenerations()
  draftAiChatStore.set({})
  clearLocalStorageByPrefix(CHAT_DRAFT_LOCAL_PREFIX)
  aiChatDraftPurgeTick.update((tick) => tick + 1)
  return count
}
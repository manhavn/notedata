import { get, writable } from 'svelte/store'
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
}

/** In-memory AI chat drafts keyed by note id. Cleared on explicit clear or page reload. */
export const draftAiChatStore = writable<Record<string, NoteAiChatDraft>>({})
export const aiChatDraftPurgeTick = writable(0)

function cloneDraft(draft: NoteAiChatDraft): NoteAiChatDraft {
  return {
    messages: draft.messages.map((message) => ({ ...message })),
    input: draft.input,
    open: draft.open,
  }
}

export function loadDraftAiChat(noteId: string): NoteAiChatDraft | undefined {
  const inMemory = get(draftAiChatStore)[noteId]
  if (inMemory) return cloneDraft(inMemory)

  if (!isPersistAiChatLocalEnabled()) return undefined

  const localDraft = readChatDraftFromLocalStorage(noteId)
  if (!localDraft) return undefined

  draftAiChatStore.update((drafts) => ({
    ...drafts,
    [noteId]: cloneDraft(localDraft),
  }))

  return cloneDraft(localDraft)
}

export function setDraftAiChat(noteId: string, draft: NoteAiChatDraft) {
  const next = cloneDraft(draft)

  draftAiChatStore.update((drafts) => ({
    ...drafts,
    [noteId]: next,
  }))

  if (isPersistAiChatLocalEnabled()) {
    writeChatDraftToLocalStorage(noteId, next)
  }
}

export function clearDraftAiChat(noteId: string) {
  draftAiChatStore.update((drafts) => {
    if (!(noteId in drafts)) return drafts
    const { [noteId]: _removed, ...rest } = drafts
    return rest
  })
  removeChatDraftFromLocalStorage(noteId)
}

export function clearDraftAiChats(noteIds: string[]) {
  if (noteIds.length === 0) return
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
  const noteIds = new Set(Object.keys(get(draftAiChatStore)))
  for (const key of listLocalStorageKeysByPrefix(CHAT_DRAFT_LOCAL_PREFIX)) {
    noteIds.add(key.slice(CHAT_DRAFT_LOCAL_PREFIX.length))
  }
  return noteIds.size
}

export function purgeAllAiChatDrafts(): number {
  const count = countAiChatDrafts()
  draftAiChatStore.set({})
  clearLocalStorageByPrefix(CHAT_DRAFT_LOCAL_PREFIX)
  aiChatDraftPurgeTick.update((tick) => tick + 1)
  return count
}
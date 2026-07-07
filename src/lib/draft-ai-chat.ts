import { get, writable } from 'svelte/store'

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

export function setDraftAiChat(noteId: string, draft: NoteAiChatDraft) {
  draftAiChatStore.update((drafts) => ({
    ...drafts,
    [noteId]: {
      messages: [...draft.messages],
      input: draft.input,
      open: draft.open,
    },
  }))
}

export function clearDraftAiChat(noteId: string) {
  draftAiChatStore.update((drafts) => {
    if (!(noteId in drafts)) return drafts
    const { [noteId]: _removed, ...rest } = drafts
    return rest
  })
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
}

export function hasDraftAiChat(noteId: string): boolean {
  return noteId in get(draftAiChatStore)
}

export function getDraftAiChat(noteId: string): NoteAiChatDraft | undefined {
  const draft = get(draftAiChatStore)[noteId]
  if (!draft) return undefined
  return {
    messages: [...draft.messages],
    input: draft.input,
    open: draft.open,
  }
}
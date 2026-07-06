import { get, writable } from 'svelte/store'

/** Unsaved note content keyed by note id (decoded/plain text). Cleared on save or page reload. */
export const draftContentStore = writable<Record<string, string>>({})

export function setDraftContent(noteId: string, content: string) {
  draftContentStore.update((drafts) => ({ ...drafts, [noteId]: content }))
}

export function clearDraftContent(noteId: string) {
  draftContentStore.update((drafts) => {
    if (!(noteId in drafts)) return drafts
    const { [noteId]: _removed, ...rest } = drafts
    return rest
  })
}

export function clearDraftContents(noteIds: string[]) {
  if (noteIds.length === 0) return
  draftContentStore.update((drafts) => {
    const next = { ...drafts }
    for (const id of noteIds) {
      delete next[id]
    }
    return next
  })
}

export function hasDraftContent(noteId: string): boolean {
  return noteId in get(draftContentStore)
}

export function getDraftContent(noteId: string): string | undefined {
  return get(draftContentStore)[noteId]
}
import { get, writable } from 'svelte/store'
import {
  clearLocalStorageByPrefix,
  listLocalStorageKeysByPrefix,
  NOTE_DRAFT_LOCAL_PREFIX,
  readNoteDraftFromLocalStorage,
  removeNoteDraftFromLocalStorage,
  writeNoteDraftToLocalStorage,
} from './local-draft-storage'
import { isPersistNoteDraftLocalEnabled } from './user-settings.svelte'

/** Unsaved note content keyed by note id (decoded/plain text). Cleared on save or page reload. */
export const draftContentStore = writable<Record<string, string>>({})
export const noteDraftPurgeTick = writable(0)

export function peekDraftContent(noteId: string): string | undefined {
  const inMemory = get(draftContentStore)[noteId]
  if (inMemory !== undefined) return inMemory

  if (!isPersistNoteDraftLocalEnabled()) return undefined
  return readNoteDraftFromLocalStorage(noteId)
}

export function loadDraftContent(noteId: string): string | undefined {
  const inMemory = get(draftContentStore)[noteId]
  if (inMemory !== undefined) return inMemory

  const localDraft = peekDraftContent(noteId)
  if (localDraft === undefined) return undefined

  draftContentStore.update((drafts) => ({ ...drafts, [noteId]: localDraft }))
  return localDraft
}

export function setDraftContent(noteId: string, content: string) {
  draftContentStore.update((drafts) => ({ ...drafts, [noteId]: content }))

  if (isPersistNoteDraftLocalEnabled()) {
    writeNoteDraftToLocalStorage(noteId, content)
  }
}

export function clearDraftContent(noteId: string) {
  draftContentStore.update((drafts) => {
    if (!(noteId in drafts)) return drafts
    const { [noteId]: _removed, ...rest } = drafts
    return rest
  })
  removeNoteDraftFromLocalStorage(noteId)
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
  for (const id of noteIds) {
    removeNoteDraftFromLocalStorage(id)
  }
}

export function hasDraftContent(noteId: string): boolean {
  return peekDraftContent(noteId) !== undefined
}

export function getDraftContent(noteId: string): string | undefined {
  return loadDraftContent(noteId)
}

export function countNoteDrafts(): number {
  const noteIds = new Set(Object.keys(get(draftContentStore)))
  for (const key of listLocalStorageKeysByPrefix(NOTE_DRAFT_LOCAL_PREFIX)) {
    noteIds.add(key.slice(NOTE_DRAFT_LOCAL_PREFIX.length))
  }
  return noteIds.size
}

export function purgeAllNoteDrafts(): number {
  const count = countNoteDrafts()
  draftContentStore.set({})
  clearLocalStorageByPrefix(NOTE_DRAFT_LOCAL_PREFIX)
  noteDraftPurgeTick.update((tick) => tick + 1)
  return count
}
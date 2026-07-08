import { get, writable } from 'svelte/store'

/** Header collapse state keyed by note id. Preserved while a note is unsaved or unlocked. */
export const noteHeaderCollapseStore = writable<Record<string, boolean>>({})

export function getNoteHeaderCollapsed(noteId: string): boolean {
  return get(noteHeaderCollapseStore)[noteId] ?? false
}

export function setNoteHeaderCollapsed(noteId: string, collapsed: boolean) {
  noteHeaderCollapseStore.update((states) => ({ ...states, [noteId]: collapsed }))
}

export function clearNoteHeaderCollapsed(noteId: string) {
  noteHeaderCollapseStore.update((states) => {
    if (!(noteId in states)) return states
    const { [noteId]: _removed, ...rest } = states
    return rest
  })
}
export interface StoredNotePasscode {
  code: string
  keyId: string
}

export type NotePasscodeScope = 'notes' | 'trash'

export const notePasscodeState = $state({
  passcodes: {} as Record<string, StoredNotePasscode>,
  lockAllTick: 0,
})

export const trashNotePasscodeState = $state({
  passcodes: {} as Record<string, StoredNotePasscode>,
  lockAllTick: 0,
})

function getPasscodeState(scope: NotePasscodeScope) {
  return scope === 'trash' ? trashNotePasscodeState : notePasscodeState
}

export function setNotePasscode(
  noteId: string,
  code: string,
  keyId: string,
  scope: NotePasscodeScope = 'notes',
) {
  const state = getPasscodeState(scope)
  state.passcodes = {
    ...state.passcodes,
    [noteId]: { code, keyId },
  }
}

export function getNotePasscode(
  noteId: string,
  scope: NotePasscodeScope = 'notes',
): StoredNotePasscode | null {
  return getPasscodeState(scope).passcodes[noteId] ?? null
}

export function hasNotePasscode(noteId: string, scope: NotePasscodeScope = 'notes'): boolean {
  return noteId in getPasscodeState(scope).passcodes
}

export function clearNotePasscode(noteId: string, scope: NotePasscodeScope = 'notes') {
  const state = getPasscodeState(scope)
  if (!(noteId in state.passcodes)) return

  const { [noteId]: _removed, ...rest } = state.passcodes
  state.passcodes = rest
}

export function clearNotePasscodes(noteIds: string[], scope: NotePasscodeScope = 'notes') {
  for (const noteId of noteIds) {
    clearNotePasscode(noteId, scope)
  }
}

export function getUnlockedNoteCount(scope: NotePasscodeScope = 'notes'): number {
  return Object.keys(getPasscodeState(scope).passcodes).length
}

export function lockAllNotes(scope: NotePasscodeScope = 'notes') {
  const state = getPasscodeState(scope)
  if (Object.keys(state.passcodes).length === 0) return

  state.passcodes = {}
  state.lockAllTick += 1
}

export function pruneTrashNotePasscodes(validIds: string[]) {
  const valid = new Set(validIds)
  const next = Object.fromEntries(
    Object.entries(trashNotePasscodeState.passcodes).filter(([id]) => valid.has(id)),
  )

  if (Object.keys(next).length !== Object.keys(trashNotePasscodeState.passcodes).length) {
    trashNotePasscodeState.passcodes = next
  }
}
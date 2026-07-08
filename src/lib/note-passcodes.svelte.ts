export interface StoredNotePasscode {
  code: string
  keyId: string
}

export const notePasscodeState = $state({
  passcodes: {} as Record<string, StoredNotePasscode>,
  lockAllTick: 0,
})

export function setNotePasscode(noteId: string, code: string, keyId: string) {
  notePasscodeState.passcodes = {
    ...notePasscodeState.passcodes,
    [noteId]: { code, keyId },
  }
}

export function getNotePasscode(noteId: string): StoredNotePasscode | null {
  return notePasscodeState.passcodes[noteId] ?? null
}

export function hasNotePasscode(noteId: string): boolean {
  return noteId in notePasscodeState.passcodes
}

export function clearNotePasscode(noteId: string) {
  if (!(noteId in notePasscodeState.passcodes)) return

  const { [noteId]: _removed, ...rest } = notePasscodeState.passcodes
  notePasscodeState.passcodes = rest
}

export function getUnlockedNoteCount(): number {
  return Object.keys(notePasscodeState.passcodes).length
}

export function lockAllNotes() {
  if (getUnlockedNoteCount() === 0) return

  notePasscodeState.passcodes = {}
  notePasscodeState.lockAllTick += 1
}
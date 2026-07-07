import type { AiChatSettingsStore } from './ai-providers'
import type { NoteAiActiveIds } from './types'

export type { NoteAiActiveIds } from './types'

export interface AiActiveSelection {
  providerId: string | null
  modelId: string | null
  apiKeyId: string | null
}

export type AiSelectionStatus = 'ready' | 'needs_global' | 'needs_note'

export interface ResolvedNoteAiSelection extends AiActiveSelection {
  status: AiSelectionStatus
  usesNoteSelection: boolean
}

export function noteHasAiActiveIds(note: NoteAiActiveIds | null | undefined): boolean {
  if (!note) return false
  return (
    note.aiActiveProviderId != null ||
    note.aiActiveModelId != null ||
    note.aiActiveApiKeyId != null
  )
}

export function isAiActiveSelectionValid(
  store: AiChatSettingsStore,
  selection: AiActiveSelection,
): boolean {
  if (!selection.providerId || !(selection.providerId in store.providers)) return false
  if (!selection.modelId || !(selection.modelId in store.models)) return false

  const provider = store.providers[selection.providerId]
  if (!provider.completionsUrl.trim()) return false

  if (selection.apiKeyId && !(selection.apiKeyId in store.apiKeys)) return false

  return true
}

export function getGlobalAiActiveSelection(store: AiChatSettingsStore): AiActiveSelection {
  return {
    providerId: store.activeProviderId,
    modelId: store.activeModelId,
    apiKeyId: store.activeApiKeyId,
  }
}

export function getNoteAiActiveSelection(note: NoteAiActiveIds): AiActiveSelection {
  return {
    providerId: note.aiActiveProviderId ?? null,
    modelId: note.aiActiveModelId ?? null,
    apiKeyId: note.aiActiveApiKeyId ?? null,
  }
}

export function getMergedNoteAiSelection(
  note: NoteAiActiveIds,
  store: AiChatSettingsStore,
): AiActiveSelection {
  const globalSelection = getGlobalAiActiveSelection(store)

  return {
    providerId:
      note.aiActiveProviderId !== undefined
        ? (note.aiActiveProviderId ?? null)
        : globalSelection.providerId,
    modelId:
      note.aiActiveModelId !== undefined
        ? (note.aiActiveModelId ?? null)
        : globalSelection.modelId,
    apiKeyId:
      note.aiActiveApiKeyId !== undefined
        ? (note.aiActiveApiKeyId ?? null)
        : globalSelection.apiKeyId,
  }
}

export function resolveNoteAiSelection(
  note: NoteAiActiveIds | null | undefined,
  store: AiChatSettingsStore,
): ResolvedNoteAiSelection {
  const globalSelection = getGlobalAiActiveSelection(store)
  const globalValid = isAiActiveSelectionValid(store, globalSelection)

  if (!globalValid) {
    return {
      ...globalSelection,
      status: 'needs_global',
      usesNoteSelection: false,
    }
  }

  if (!note || !noteHasAiActiveIds(note)) {
    return {
      ...globalSelection,
      status: 'ready',
      usesNoteSelection: false,
    }
  }

  const mergedSelection = getMergedNoteAiSelection(note, store)
  if (isAiActiveSelectionValid(store, mergedSelection)) {
    return {
      ...mergedSelection,
      status: 'ready',
      usesNoteSelection: true,
    }
  }

  return {
    ...mergedSelection,
    status: 'needs_note',
    usesNoteSelection: true,
  }
}

export function aiActiveSelectionToNotePatch(
  selection: AiActiveSelection,
): Partial<NoteAiActiveIds> {
  return {
    aiActiveProviderId: selection.providerId,
    aiActiveModelId: selection.modelId,
    aiActiveApiKeyId: selection.apiKeyId,
  }
}

export function noteAiActivePersistNeeded(
  note: NoteAiActiveIds | null | undefined,
  selection: AiActiveSelection,
): boolean {
  if (!selection.providerId || !selection.modelId) return false

  if (note?.aiActiveProviderId !== selection.providerId) return true
  if (note?.aiActiveModelId !== selection.modelId) return true

  const noteApiKey = note?.aiActiveApiKeyId ?? null
  const selectionApiKey = selection.apiKeyId ?? null
  if (noteApiKey !== selectionApiKey) return true

  return false
}

export function withStoreActiveSelection(
  store: AiChatSettingsStore,
  selection: AiActiveSelection,
): AiChatSettingsStore {
  return {
    ...store,
    activeProviderId: selection.providerId,
    activeModelId: selection.modelId,
    activeApiKeyId: selection.apiKeyId,
  }
}
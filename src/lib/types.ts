export type NoteContentViewMode = 'edit' | 'txt' | 'md' | 'html'

export interface NoteAiActiveIds {
  aiActiveProviderId?: string | null
  aiActiveModelId?: string | null
  aiActiveApiKeyId?: string | null
}

export interface Note extends NoteAiActiveIds {
  id: string
  title: string
  /** Loaded on demand; omitted from list subscriptions. */
  content?: string
  tags?: string[]
  createdAt: number
  updatedAt: number
  encrypted?: boolean
  keyId?: string
  contentViewMode?: NoteContentViewMode
}

export interface TrashedNote extends Note {
  deletedAt: number
}

export interface NoteInput extends NoteAiActiveIds {
  title: string
  content: string
  tags?: string[]
  encrypted?: boolean
  keyId?: string
  contentViewMode?: NoteContentViewMode
}

export interface ImportedNoteInput extends NoteInput {
  createdAt?: number
  updatedAt?: number
}

export interface EncryptionKey {
  id: string
  label: string
  codeHash: string
  createdAt: number
}
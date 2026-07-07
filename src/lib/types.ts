export interface NoteAiActiveIds {
  aiActiveProviderId?: string | null
  aiActiveModelId?: string | null
  aiActiveApiKeyId?: string | null
}

export interface Note extends NoteAiActiveIds {
  id: string
  title: string
  content: string
  tags?: string[]
  createdAt: number
  updatedAt: number
  encrypted?: boolean
  keyId?: string
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
}

export interface EncryptionKey {
  id: string
  label: string
  codeHash: string
  createdAt: number
}
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import {
  setUserAutoUnlockAfterSave,
  setUserDisableAiChat,
  setUserPersistAiChatLocal,
  setUserPersistNoteDraftLocal,
  subscribeToUserSettings,
} from './user-settings'

export const userSettingsState = $state({
  disableAiChat: false,
  persistAiChatLocal: false,
  persistNoteDraftLocal: false,
  autoUnlockAfterSave: false,
  loaded: false,
})

let unsubscribe: (() => void) | null = null

function bindUserSettings(userId: string | null) {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }

  if (!userId) {
    userSettingsState.disableAiChat = false
    userSettingsState.persistAiChatLocal = false
    userSettingsState.persistNoteDraftLocal = false
    userSettingsState.autoUnlockAfterSave = false
    userSettingsState.loaded = false
    return
  }

  unsubscribe = subscribeToUserSettings(userId, (settings) => {
    userSettingsState.disableAiChat = settings.disableAiChat
    userSettingsState.persistAiChatLocal = settings.persistAiChatLocal
    userSettingsState.persistNoteDraftLocal = settings.persistNoteDraftLocal
    userSettingsState.autoUnlockAfterSave = settings.autoUnlockAfterSave
    userSettingsState.loaded = true
  })
}

onAuthStateChanged(auth, (user) => {
  bindUserSettings(user?.uid ?? null)
})

export function isUserAiChatEnabled(): boolean {
  return !userSettingsState.disableAiChat
}

export function isPersistAiChatLocalEnabled(): boolean {
  return userSettingsState.persistAiChatLocal
}

export function isPersistNoteDraftLocalEnabled(): boolean {
  return userSettingsState.persistNoteDraftLocal
}

export function isAutoUnlockAfterSaveEnabled(): boolean {
  return userSettingsState.autoUnlockAfterSave
}

export async function saveUserDisableAiChat(disabled: boolean) {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Not signed in')

  await setUserDisableAiChat(userId, disabled)
}

export async function saveUserPersistAiChatLocal(enabled: boolean) {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Not signed in')

  await setUserPersistAiChatLocal(userId, enabled)
}

export async function saveUserPersistNoteDraftLocal(enabled: boolean) {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Not signed in')

  await setUserPersistNoteDraftLocal(userId, enabled)
}

export async function saveUserAutoUnlockAfterSave(enabled: boolean) {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Not signed in')

  await setUserAutoUnlockAfterSave(userId, enabled)
}
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import { setUserDisableAiChat, subscribeToUserSettings } from './user-settings'

export const userSettingsState = $state({
  disableAiChat: false,
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
    userSettingsState.loaded = false
    return
  }

  unsubscribe = subscribeToUserSettings(userId, (settings) => {
    userSettingsState.disableAiChat = settings.disableAiChat
    userSettingsState.loaded = true
  })
}

onAuthStateChanged(auth, (user) => {
  bindUserSettings(user?.uid ?? null)
})

export function isUserAiChatEnabled(): boolean {
  return !userSettingsState.disableAiChat
}

export async function saveUserDisableAiChat(disabled: boolean) {
  const userId = auth.currentUser?.uid
  if (!userId) throw new Error('Not signed in')

  await setUserDisableAiChat(userId, disabled)
}
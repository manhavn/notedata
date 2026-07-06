const STORAGE_KEY = 'notedata-passcode-autofocus'

export const passcodeFocusState = $state({
  enabled: false,
})

export function initPasscodeFocus() {
  passcodeFocusState.enabled = localStorage.getItem(STORAGE_KEY) === 'true'
}

export function setPasscodeAutoFocus(enabled: boolean) {
  passcodeFocusState.enabled = enabled
  localStorage.setItem(STORAGE_KEY, String(enabled))
}

export function togglePasscodeAutoFocus() {
  setPasscodeAutoFocus(!passcodeFocusState.enabled)
}
const STORAGE_KEY = 'notedata-passcode-keyboard-mode'

export const passcodeKeyboardState = $state({
  enabled: false,
})

export function initPasscodeKeyboard() {
  passcodeKeyboardState.enabled = localStorage.getItem(STORAGE_KEY) === 'true'
}

export function setPasscodeKeyboardMode(enabled: boolean) {
  passcodeKeyboardState.enabled = enabled
  localStorage.setItem(STORAGE_KEY, String(enabled))
}

export function togglePasscodeKeyboardMode() {
  setPasscodeKeyboardMode(!passcodeKeyboardState.enabled)
}

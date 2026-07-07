export type AccountModalFocusSection = 'aiChat' | null

export const accountModalState = $state({
  open: false,
  focusSection: null as AccountModalFocusSection,
})

export function openAccountSettings(focusSection: AccountModalFocusSection = null) {
  accountModalState.open = true
  accountModalState.focusSection = focusSection
}

export function closeAccountSettings() {
  accountModalState.open = false
  accountModalState.focusSection = null
}
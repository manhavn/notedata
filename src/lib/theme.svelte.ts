const THEME_STORAGE_KEY = 'notedata-theme'

export type ThemeMode = 'dark' | 'light'

export const themeState = $state({
  mode: 'dark' as ThemeMode,
})

function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode
}

export function initTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  themeState.mode = stored === 'light' ? 'light' : 'dark'
  applyTheme(themeState.mode)
}

export function setTheme(mode: ThemeMode) {
  themeState.mode = mode
  localStorage.setItem(THEME_STORAGE_KEY, mode)
  applyTheme(mode)
}

export function toggleTheme() {
  setTheme(themeState.mode === 'dark' ? 'light' : 'dark')
}
/** True on macOS / iOS so UI can show ⌘ instead of Ctrl. */
export function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/** Platform-aware mod shortcut label, e.g. `Ctrl+S` or `⌘S`. */
export function getModShortcut(key: string): string {
  const letter = key.length === 1 ? key.toUpperCase() : key
  return isApplePlatform() ? `⌘${letter}` : `Ctrl+${letter}`
}

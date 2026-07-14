type EscapeHandler = () => void

const handlers: EscapeHandler[] = []
let listening = false

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (handlers.length === 0) return

  event.preventDefault()
  handlers[handlers.length - 1]()
}

function ensureListener() {
  if (listening) return
  listening = true
  window.addEventListener('keydown', onKeydown)
}

/** Register a popup Escape handler. Last registered = topmost (closes first). */
export function registerEscapeHandler(handler: EscapeHandler): () => void {
  ensureListener()
  handlers.push(handler)
  return () => {
    const index = handlers.lastIndexOf(handler)
    if (index >= 0) handlers.splice(index, 1)
  }
}

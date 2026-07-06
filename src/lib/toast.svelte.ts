export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastRequest {
  message: string
  variant?: ToastVariant
  duration?: number
}

export interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
  duration: number
  createdAt: number
}

const DEFAULT_DURATION = 4200
const ERROR_DURATION = 5600
const MAX_TOASTS = 6

export const toastState = $state({
  items: [] as ToastItem[],
})

const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>()
const pausedRemaining = new Map<string, number>()

function normalizeRequest(input: string | ToastRequest): ToastRequest {
  return typeof input === 'string' ? { message: input } : input
}

function clearDismissTimer(id: string) {
  const timer = dismissTimers.get(id)
  if (timer) {
    clearTimeout(timer)
    dismissTimers.delete(id)
  }
  pausedRemaining.delete(id)
}

export function dismissToast(id: string) {
  clearDismissTimer(id)
  toastState.items = toastState.items.filter((toast) => toast.id !== id)
}

function scheduleDismiss(id: string, duration: number) {
  clearDismissTimer(id)
  dismissTimers.set(
    id,
    setTimeout(() => dismissToast(id), duration),
  )
}

export function pauseToast(id: string) {
  const timer = dismissTimers.get(id)
  if (!timer) return

  clearTimeout(timer)
  dismissTimers.delete(id)

  const item = toastState.items.find((toast) => toast.id === id)
  if (!item) return

  const elapsed = Date.now() - item.createdAt
  pausedRemaining.set(id, Math.max(0, item.duration - elapsed))
}

export function resumeToast(id: string) {
  const remaining = pausedRemaining.get(id)
  if (remaining === undefined) return

  pausedRemaining.delete(id)
  if (remaining <= 0) {
    dismissToast(id)
    return
  }

  scheduleDismiss(id, remaining)
}

export function showToast(input: string | ToastRequest): string {
  const request = normalizeRequest(input)
  const variant = request.variant ?? 'info'
  const duration =
    request.duration ?? (variant === 'error' ? ERROR_DURATION : DEFAULT_DURATION)

  const item: ToastItem = {
    id: crypto.randomUUID(),
    message: request.message,
    variant,
    duration,
    createdAt: Date.now(),
  }

  const next = [...toastState.items, item]
  if (next.length > MAX_TOASTS) {
    const removed = next.slice(0, next.length - MAX_TOASTS)
    removed.forEach((toast) => clearDismissTimer(toast.id))
    toastState.items = next.slice(-MAX_TOASTS)
  } else {
    toastState.items = next
  }

  scheduleDismiss(item.id, duration)
  return item.id
}

export function toastSuccess(message: string, duration?: number) {
  return showToast({ message, variant: 'success', duration })
}

export function toastError(message: string, duration?: number) {
  return showToast({ message, variant: 'error', duration })
}

export function toastInfo(message: string, duration?: number) {
  return showToast({ message, variant: 'info', duration })
}

export function toastWarning(message: string, duration?: number) {
  return showToast({ message, variant: 'warning', duration })
}
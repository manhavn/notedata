export type DialogVariant = 'default' | 'danger' | 'warning' | 'success' | 'info' | 'lock'

export interface DialogRequest {
  message: string
  title?: string
  variant?: DialogVariant
  confirmLabel?: string
  cancelLabel?: string
}

type DialogMode = 'confirm' | 'alert'

export const dialogState = $state({
  open: false,
  mode: 'confirm' as DialogMode,
  message: '',
  title: null as string | null,
  variant: 'default' as DialogVariant,
  confirmLabel: null as string | null,
  cancelLabel: null as string | null,
})

let resolver: ((value: boolean) => void) | null = null

function normalizeRequest(input: string | DialogRequest): DialogRequest {
  return typeof input === 'string' ? { message: input } : input
}

function openDialog(mode: DialogMode, input: string | DialogRequest): Promise<boolean> {
  const request = normalizeRequest(input)

  if (dialogState.open) {
    resolveDialog(false)
  }

  dialogState.open = true
  dialogState.mode = mode
  dialogState.message = request.message
  dialogState.title = request.title ?? null
  dialogState.variant = request.variant ?? 'default'
  dialogState.confirmLabel = request.confirmLabel ?? null
  dialogState.cancelLabel = request.cancelLabel ?? null

  return new Promise<boolean>((resolve) => {
    resolver = resolve
  })
}

export function confirm(input: string | DialogRequest): Promise<boolean> {
  return openDialog('confirm', input)
}

export function alert(input: string | DialogRequest): Promise<void> {
  return openDialog('alert', input).then(() => undefined)
}

export function resolveDialog(confirmed: boolean) {
  dialogState.open = false
  resolver?.(confirmed)
  resolver = null
}
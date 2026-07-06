<script lang="ts">
  import { dialogState, resolveDialog } from '../dialog.svelte'
  import { t } from '../i18n.svelte'
  import { portal } from '../portal'

  const title = $derived(
    dialogState.title ??
      (dialogState.variant === 'danger'
        ? t('dialogTitleDanger')
        : dialogState.variant === 'warning'
          ? t('dialogTitleWarning')
          : dialogState.variant === 'success'
            ? t('dialogTitleSuccess')
            : dialogState.variant === 'info' || dialogState.variant === 'default'
              ? dialogState.mode === 'alert'
                ? t('dialogTitleInfo')
                : t('dialogTitleConfirm')
              : t('dialogTitleConfirm')),
  )

  const confirmLabel = $derived(
    dialogState.confirmLabel ??
      (dialogState.mode === 'alert'
        ? t('ok')
        : dialogState.variant === 'danger'
          ? t('confirmAction')
          : t('confirmAction')),
  )

  const cancelLabel = $derived(dialogState.cancelLabel ?? t('cancel'))

  function handleConfirm() {
    resolveDialog(true)
  }

  function handleCancel() {
    resolveDialog(false)
  }

  function handleOverlayClick() {
    if (dialogState.mode === 'confirm') {
      handleCancel()
    } else {
      handleConfirm()
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!dialogState.open) return

    if (event.key === 'Escape') {
      event.preventDefault()
      if (dialogState.mode === 'confirm') {
        handleCancel()
      } else {
        handleConfirm()
      }
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      handleConfirm()
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if dialogState.open}
  <div class="dialog-root" use:portal>
    <button
      type="button"
      class="overlay"
      aria-label={t('closeMenu')}
      onclick={handleOverlayClick}
    ></button>

    <div
      class="dialog"
      class:variant-danger={dialogState.variant === 'danger'}
      class:variant-warning={dialogState.variant === 'warning'}
      class:variant-success={dialogState.variant === 'success'}
      class:variant-info={dialogState.variant === 'info'}
      role={dialogState.mode === 'alert' ? 'alertdialog' : 'dialog'}
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-message"
    >
      <div class="dialog-icon" aria-hidden="true">
        {#if dialogState.variant === 'danger'}
          <svg viewBox="0 0 24 24">
            <path
              d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        {:else if dialogState.variant === 'warning'}
          <svg viewBox="0 0 24 24">
            <path
              d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        {:else if dialogState.variant === 'success'}
          <svg viewBox="0 0 24 24">
            <path
              d="M20 6L9 17l-5-5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        {:else if dialogState.variant === 'info'}
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
            <path
              d="M12 10v6M12 7h.01"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
            <path
              d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 17h.01"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        {/if}
      </div>

      <h2 id="dialog-title" class="dialog-title">{title}</h2>
      <p id="dialog-message" class="dialog-message">{dialogState.message}</p>

      <div class="dialog-actions">
        {#if dialogState.mode === 'confirm'}
          <button type="button" class="ghost-btn" onclick={handleCancel}>
            {cancelLabel}
          </button>
        {/if}
        <button
          type="button"
          class="confirm-btn"
          class:danger={dialogState.variant === 'danger'}
          class:success={dialogState.variant === 'success'}
          onclick={handleConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-root {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: grid;
    place-items: center;
    padding: 1.25rem;
    pointer-events: none;
  }

  .overlay {
    position: absolute;
    inset: 0;
    border: none;
    background: var(--overlay);
    cursor: pointer;
    pointer-events: auto;
    animation: fade-in 0.2s ease;
  }

  .dialog {
    position: relative;
    width: min(92vw, 400px);
    padding: 1.75rem 1.5rem 1.5rem;
    border: 1px solid var(--border);
    border-radius: 20px;
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    text-align: center;
    pointer-events: auto;
    animation: dialog-in 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .dialog-icon {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    margin: 0 auto 1rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    color: var(--accent);
  }

  .dialog-icon svg {
    width: 26px;
    height: 26px;
  }

  .variant-danger .dialog-icon {
    background: var(--danger-bg);
    color: var(--danger);
  }

  .variant-warning .dialog-icon {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--accent);
  }

  .variant-success .dialog-icon {
    background: var(--success-bg);
    color: var(--success);
  }

  .variant-info .dialog-icon {
    background: color-mix(in srgb, var(--text-muted) 16%, transparent);
    color: var(--text-muted);
  }

  .dialog-title {
    margin: 0 0 0.5rem;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--text);
  }

  .dialog-message {
    margin: 0 0 1.5rem;
    color: var(--text-muted);
    font-size: 0.95rem;
    line-height: 1.55;
  }

  .dialog-actions {
    display: flex;
    justify-content: center;
    gap: 0.6rem;
  }

  .ghost-btn,
  .confirm-btn {
    min-width: 7rem;
    border: none;
    border-radius: 10px;
    padding: 0.7rem 1.1rem;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.2s ease, opacity 0.2s ease;
  }

  .ghost-btn {
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
  }

  .ghost-btn:hover {
    background: var(--surface);
  }

  .confirm-btn {
    background: linear-gradient(135deg, var(--accent), #f97316);
    color: white;
  }

  .confirm-btn:hover {
    opacity: 0.92;
  }

  .confirm-btn.danger {
    background: linear-gradient(135deg, var(--danger), #b91c1c);
  }

  .confirm-btn.success {
    background: linear-gradient(135deg, var(--success), #15803d);
  }

  .ghost-btn:active,
  .confirm-btn:active {
    transform: scale(0.98);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes dialog-in {
    from {
      opacity: 0;
      transform: scale(0.94) translateY(8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
</style>
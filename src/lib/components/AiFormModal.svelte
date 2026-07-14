<script lang="ts">
  import type { Snippet } from 'svelte'
  import { t } from '../i18n.svelte'
  import { registerEscapeHandler } from '../modal-escape'
  import { portal } from '../portal'

  interface Props {
    open: boolean
    title: string
    subtitle?: string
    large?: boolean
    onClose: () => void
    body?: Snippet
    footer?: Snippet
  }

  let {
    open,
    title,
    subtitle = '',
    large = false,
    onClose,
    body,
    footer,
  }: Props = $props()

  let overlayReady = $state(false)

  function handleClose() {
    onClose()
  }

  $effect(() => {
    if (!open) {
      overlayReady = false
      return
    }

    overlayReady = false
    const timeout = window.setTimeout(() => {
      overlayReady = true
    }, 120)

    return () => window.clearTimeout(timeout)
  })

  $effect(() => {
    if (!open) return
    return registerEscapeHandler(handleClose)
  })
</script>

{#if open}
  <div class="ai-form-layer" use:portal>
    <button
      type="button"
      class="overlay"
      class:ready={overlayReady}
      aria-label={t('cancel')}
      onclick={handleClose}
    ></button>

    <div class="modal" class:large role="dialog" aria-modal="true" aria-labelledby="ai-form-title">
      <div class="modal-header">
        <div class="modal-header-copy">
          <h2 id="ai-form-title">{title}</h2>
          {#if subtitle}
            <p>{subtitle}</p>
          {/if}
        </div>
        <button type="button" class="close-btn" onclick={handleClose} aria-label={t('cancel')}>
          <svg class="close-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M18 6L6 18M6 6l12 12"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      {#if body}
        <div class="modal-body">{@render body()}</div>
      {/if}

      {#if footer}
        <div class="modal-footer">{@render footer()}</div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    border: none;
    background: var(--overlay);
    z-index: 52;
    cursor: pointer;
    pointer-events: none;
  }

  .overlay.ready {
    pointer-events: auto;
  }

  .modal {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(94vw, 420px);
    max-height: min(90vh, 720px);
    overflow-y: auto;
    padding: 1.25rem;
    border: 1px solid var(--border);
    border-radius: 18px;
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    z-index: 53;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .modal.large {
    width: min(94vw, 560px);
    padding: 1.5rem 1.65rem;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    min-width: 0;
    flex-shrink: 0;
  }

  .modal-header-copy {
    min-width: 0;
    flex: 1;
  }

  .modal-header h2 {
    margin: 0 0 0.25rem;
    font-size: 1.15rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .modal-header p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.88rem;
    line-height: 1.5;
  }

  .close-btn {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: var(--bg);
    color: var(--text-muted);
    cursor: pointer;
    flex-shrink: 0;
  }

  .close-btn:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--text-muted) 10%, var(--bg));
  }

  .close-icon {
    width: 18px;
    height: 18px;
  }

  .modal-body {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    min-width: 0;
  }

  .modal-footer {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    padding-top: 0.15rem;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
</style>
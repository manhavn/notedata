<script lang="ts">
  import { untrack } from 'svelte'
  import {
    createEncryptionKey,
    deleteEncryptionKey,
    getEncryptionKeys,
    maskKeyCode,
  } from '../encryption-keys'
  import { confirm } from '../dialog.svelte'
  import { t } from '../i18n.svelte'
  import { registerEscapeHandler } from '../modal-escape'
  import { passcodeLengthParams } from '../passcode'
  import { toastError, toastSuccess } from '../toast.svelte'
  import { PAGE_SIZE } from '../pagination'
  import type { EncryptionKey } from '../types'
  import PasscodePad from './PasscodePad.svelte'

  interface Props {
    open: boolean
    onClose: () => void
  }

  let { open, onClose }: Props = $props()

  let keys = $state<EncryptionKey[]>([])
  let displayLimit = $state(PAGE_SIZE)
  let mode = $state<'list' | 'label' | 'create' | 'confirm'>('list')
  let label = $state('')
  let draftCode = $state('')
  let error = $state<string | null>(null)
  let passcodePad = $state<PasscodePad | undefined>(undefined)

  $effect(() => {
    if (!open) return
    untrack(() => {
      refreshKeys()
      displayLimit = PAGE_SIZE
      mode = 'list'
      label = ''
      draftCode = ''
      error = null
    })
  })

  const visibleKeys = $derived(keys.slice(0, displayLimit))
  const hasMore = $derived(keys.length > displayLimit)

  function refreshKeys() {
    keys = getEncryptionKeys()
  }

  function loadMore() {
    displayLimit += PAGE_SIZE
  }

  function resetCreateFlow() {
    mode = 'list'
    label = ''
    draftCode = ''
    error = null
    passcodePad?.reset()
  }

  function startCreate() {
    mode = 'label'
    label = `Key ${keys.length + 1}`
    error = null
  }

  function continueToCreate() {
    mode = 'create'
    error = null
    passcodePad?.reset()
  }

  function handleCreateComplete(code: string) {
    draftCode = code
    mode = 'confirm'
    error = null
    passcodePad?.reset()
  }

  async function handleConfirmComplete(code: string) {
    if (code !== draftCode) {
      error = t('passcodeMismatch')
      passcodePad?.reset()
      return
    }

    try {
      await createEncryptionKey(label, code)
      refreshKeys()
      resetCreateFlow()
      toastSuccess(t('toastKeyCreated'))
    } catch (err) {
      toastError(err instanceof Error ? err.message : t('toastOperationFailed'))
    }
  }

  async function handleDelete(keyId: string) {
    if (!(await confirm({
      message: t('confirmDeleteKey'),
      variant: 'danger',
      confirmLabel: t('delete'),
    }))) return
    try {
      deleteEncryptionKey(keyId)
      refreshKeys()
      toastSuccess(t('toastKeyDeleted'))
    } catch (err) {
      toastError(err instanceof Error ? err.message : t('toastOperationFailed'))
    }
  }

  function handleClose() {
    resetCreateFlow()
    onClose()
  }

  $effect(() => {
    if (!open) return
    return registerEscapeHandler(handleClose)
  })
</script>

{#if open}
  <button type="button" class="overlay" aria-label={t('closeMenu')} onclick={handleClose}></button>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="key-manager-title">
    {#if mode === 'list'}
      <div class="modal-header">
        <h2 id="key-manager-title">{t('encryptionKeys')}</h2>
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

      <p class="hint">{t('encryptionKeysHint', passcodeLengthParams)}</p>

      {#if keys.length === 0}
        <p class="empty">{t('noEncryptionKeys')}</p>
      {:else}
        <div class="key-list-wrap">
          <ul class="key-list">
            {#each visibleKeys as key (key.id)}
              <li class="key-item">
                <div>
                  <strong>{key.label}</strong>
                  <span>{maskKeyCode()}</span>
                </div>
                <button type="button" class="delete-btn" onclick={() => handleDelete(key.id)}>
                  {t('delete')}
                </button>
              </li>
            {/each}
          </ul>

          {#if hasMore}
            <div class="load-more-wrap">
              <p class="load-more-info">
                {t('showingCount', { visible: visibleKeys.length, total: keys.length })}
              </p>
              <button type="button" class="load-more-btn" onclick={loadMore}>
                {t('loadMore')}
              </button>
            </div>
          {/if}
        </div>
      {/if}

      <button type="button" class="primary-btn" onclick={startCreate}>
        {t('createEncryptionKey')}
      </button>
    {:else if mode === 'label'}
      <div class="modal-header">
        <h2>{t('createEncryptionKey')}</h2>
        <button type="button" class="close-btn" onclick={resetCreateFlow} aria-label={t('cancel')}>
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

      <label class="field">
        <span>{t('keyLabel')}</span>
        <input type="text" bind:value={label} maxlength="32" />
      </label>

      <div class="actions">
        <button type="button" class="ghost-btn" onclick={resetCreateFlow}>{t('cancel')}</button>
        <button type="button" class="primary-btn" onclick={continueToCreate}>{t('continue')}</button>
      </div>
    {:else}
      <PasscodePad
        bind:this={passcodePad}
        showAutoFocusToggle
        title={mode === 'create' ? t('enterNewPasscode') : t('confirmNewPasscode')}
        subtitle={mode === 'create'
          ? t('passcodeCreateHint', passcodeLengthParams)
          : t('passcodeConfirmHint')}
        {error}
        onComplete={mode === 'create' ? handleCreateComplete : handleConfirmComplete}
        onCancel={resetCreateFlow}
      />
    {/if}
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    border: none;
    background: var(--overlay);
    z-index: 30;
    cursor: pointer;
  }

  .modal {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(92vw, 420px);
    max-height: 90vh;
    overflow-y: auto;
    padding: 1.5rem;
    border: 1px solid var(--border);
    border-radius: 20px;
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    z-index: 31;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.2rem;
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
    transition: color 0.2s, background 0.2s;
    flex-shrink: 0;
  }

  .close-btn:hover {
    background: var(--surface);
    color: var(--text);
  }

  .close-icon {
    width: 18px;
    height: 18px;
  }

  .hint,
  .empty {
    margin: 0 0 1rem;
    color: var(--text-muted);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .key-list-wrap {
    margin-bottom: 1rem;
  }

  .key-list {
    --key-item-height: 4.5rem;
    --key-gap: 0.6rem;
    list-style: none;
    margin: 0;
    padding: 0 0.15rem 0 0;
    display: flex;
    flex-direction: column;
    gap: var(--key-gap);
    max-height: calc(var(--key-item-height) * 3 + var(--key-gap) * 2);
    overflow-y: auto;
  }

  .key-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    min-height: var(--key-item-height);
    padding: 0.85rem 1rem;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--bg);
    flex-shrink: 0;
  }

  .key-item strong {
    display: block;
    margin-bottom: 0.15rem;
  }

  .key-item span {
    color: var(--text-muted);
    font-size: 0.85rem;
    letter-spacing: 0.15em;
  }

  .load-more-wrap {
    margin-top: 0.6rem;
    text-align: center;
  }

  .load-more-info {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .load-more-btn {
    width: 100%;
    padding: 0.6rem 1rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    color: var(--text);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .load-more-btn:hover {
    background: var(--surface);
  }

  .delete-btn {
    border: none;
    background: var(--danger-bg);
    color: var(--danger);
    padding: 0.4rem 0.75rem;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    margin-bottom: 1.25rem;
  }

  .field span {
    font-size: 0.875rem;
    font-weight: 600;
  }

  .field input {
    padding: 0.75rem 1rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    color: var(--text);
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  .primary-btn,
  .ghost-btn {
    border: none;
    border-radius: 10px;
    padding: 0.75rem 1rem;
    font-weight: 600;
    cursor: pointer;
  }

  .primary-btn {
    width: 100%;
    background: linear-gradient(135deg, var(--accent), #f97316);
    color: white;
  }

  .ghost-btn {
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
  }

  .actions .primary-btn {
    width: auto;
  }
</style>
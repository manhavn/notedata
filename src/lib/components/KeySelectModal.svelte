<script lang="ts">
  import { untrack } from 'svelte'
  import { getEncryptionKeys, maskKeyCode, verifyEncryptionKeyCode } from '../encryption-keys'
  import { t } from '../i18n.svelte'
  import { PAGE_SIZE } from '../pagination'
  import type { EncryptionKey } from '../types'
  import PasscodePad from './PasscodePad.svelte'

  export interface PasscodeSubmit {
    code: string
    keyId: string
  }

  interface Props {
    open: boolean
    title: string
    subtitle?: string
    suggestedKeyId?: string | null
    noteKeyId?: string | null
    allowCustomPasscode?: boolean
    customPasscodeConfirm?: boolean
    onClose: () => void
    onSuccess: (payload: PasscodeSubmit) => void
    onManageKeys?: () => void
  }

  let {
    open,
    title,
    subtitle = '',
    suggestedKeyId = null,
    noteKeyId = null,
    allowCustomPasscode = true,
    customPasscodeConfirm = false,
    onClose,
    onSuccess,
    onManageKeys,
  }: Props = $props()

  type View = 'saved' | 'custom-create' | 'custom-confirm'

  let keys = $state<EncryptionKey[]>([])
  let displayLimit = $state(PAGE_SIZE)
  let selectedKey = $state<EncryptionKey | null>(null)
  let view = $state<View>('saved')
  let draftCode = $state('')
  let draftKeyId = $state('')
  let error = $state<string | null>(null)
  let passcodePad = $state<PasscodePad | undefined>(undefined)
  let overlayReady = $state(false)

  const canUseCustomUnlock = $derived(Boolean(noteKeyId))
  const visibleKeys = $derived(keys.slice(0, displayLimit))
  const hasMore = $derived(keys.length > displayLimit)

  function initModalState() {
    keys = getEncryptionKeys()
    selectedKey =
      keys.find((key) => key.id === suggestedKeyId) ?? keys[0] ?? null

    const suggestedIndex = suggestedKeyId
      ? keys.findIndex((key) => key.id === suggestedKeyId)
      : -1
    displayLimit =
      suggestedIndex >= 0
        ? Math.max(PAGE_SIZE, suggestedIndex + 1)
        : PAGE_SIZE

    draftCode = ''
    error = null

    if (allowCustomPasscode && (customPasscodeConfirm || canUseCustomUnlock)) {
      view = 'custom-create'
      draftKeyId = customPasscodeConfirm ? crypto.randomUUID() : (noteKeyId ?? '')
    } else {
      view = 'saved'
      draftKeyId = ''
    }
  }

  function loadMore() {
    displayLimit += PAGE_SIZE
  }

  $effect(() => {
    if (!open) {
      overlayReady = false
      return
    }

    untrack(initModalState)
    overlayReady = false

    const timeout = window.setTimeout(() => {
      overlayReady = true
    }, 400)

    return () => window.clearTimeout(timeout)
  })

  function resetPasscodePad() {
    passcodePad?.reset()
  }

  function handleSelectKey(key: EncryptionKey) {
    selectedKey = key
    error = null
    resetPasscodePad()
  }

  function submitPasscode(code: string, keyId: string) {
    onSuccess({ code, keyId })
  }

  async function handleSavedPasscodeComplete(code: string) {
    if (!selectedKey) return

    const keyId = customPasscodeConfirm
      ? selectedKey.id
      : (noteKeyId ?? selectedKey.id)
    if (!keyId) return

    if (customPasscodeConfirm) {
      const valid = await verifyEncryptionKeyCode(selectedKey.id, code)
      if (!valid) {
        error = t('wrongPasscode')
        resetPasscodePad()
        return
      }
    }

    error = null
    submitPasscode(code, keyId)
  }

  function startCustomPasscode() {
    if (!customPasscodeConfirm && !canUseCustomUnlock) return

    view = 'custom-create'
    draftCode = ''
    draftKeyId = customPasscodeConfirm ? crypto.randomUUID() : (noteKeyId ?? '')
    error = null
    resetPasscodePad()
  }

  function backToSavedKeys() {
    view = 'saved'
    draftCode = ''
    draftKeyId = ''
    error = null
    resetPasscodePad()
  }

  function handleCustomCreateComplete(code: string) {
    if (customPasscodeConfirm) {
      draftCode = code
      view = 'custom-confirm'
      error = null
      resetPasscodePad()
      return
    }

    if (!draftKeyId) return
    submitPasscode(code, draftKeyId)
  }

  function handleCustomConfirmComplete(code: string) {
    if (code !== draftCode) {
      error = t('passcodeMismatch')
      resetPasscodePad()
      return
    }

    submitPasscode(code, draftKeyId)
  }

  function handleClose() {
    selectedKey = null
    view = 'saved'
    draftCode = ''
    draftKeyId = ''
    error = null
    resetPasscodePad()
    onClose()
  }

  function handleOverlayClick() {
    if (!overlayReady) return
    handleClose()
  }

  function handleCustomConfirmCancel() {
    view = 'custom-create'
    error = null
    resetPasscodePad()
  }

  function handleManageKeys() {
    if (!onManageKeys) return
    handleClose()
    onManageKeys()
  }
</script>

{#if open}
  <button
    type="button"
    class="overlay"
    class:ready={overlayReady}
    aria-label={t('closeMenu')}
    onclick={handleOverlayClick}
  ></button>
  <div class="modal" role="dialog" aria-modal="true">
    {#if view === 'custom-create' || view === 'custom-confirm'}
      <div class="custom-view">
        {#if keys.length > 0}
          <button type="button" class="accent-action-btn" onclick={backToSavedKeys}>
            {t('chooseFromSavedKeys')}
          </button>
        {:else}
          <button type="button" class="accent-action-btn" onclick={handleManageKeys}>
            {t('manageSavedKeys')}
          </button>
        {/if}

        <PasscodePad
          bind:this={passcodePad}
          showAutoFocusToggle
          title={view === 'custom-create' ? t('enterNewPasscode') : t('confirmNewPasscode')}
          subtitle={view === 'custom-create'
            ? customPasscodeConfirm
              ? t('customPasscodeSaveHint')
              : t('customPasscodeUnlockHint')
            : t('passcodeConfirmHint')}
          error={view === 'custom-confirm' ? error : null}
          onComplete={view === 'custom-create' ? handleCustomCreateComplete : handleCustomConfirmComplete}
          onCancel={view === 'custom-confirm' ? handleCustomConfirmCancel : handleClose}
        />
      </div>
    {:else if keys.length === 0}
      <div class="modal-header">
        <h2>{title}</h2>
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

      <p class="empty">{t('noEncryptionKeys')}</p>

      {#if allowCustomPasscode}
        <button
          type="button"
          class="accent-action-btn"
          onclick={startCustomPasscode}
          disabled={customPasscodeConfirm ? false : !canUseCustomUnlock}
        >
          {customPasscodeConfirm ? t('useCustomPasscodeSave') : t('useCustomPasscodeUnlock')}
        </button>
      {/if}

      <button type="button" class="primary-btn" onclick={handleManageKeys}>
        {t('manageSavedKeys')}
      </button>
      <button type="button" class="ghost-btn full" onclick={handleClose}>{t('cancel')}</button>
    {:else}
      <div class="modal-header">
        <div>
          <h2>{title}</h2>
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

      <div class="key-picker-wrap">
        <div class="key-picker">
          {#each visibleKeys as key (key.id)}
            <button
              type="button"
              class="key-option"
              class:selected={selectedKey?.id === key.id}
              onclick={() => handleSelectKey(key)}
            >
              <strong>{key.label}</strong>
              <span>{maskKeyCode()}</span>
            </button>
          {/each}
        </div>

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

      <div class="saved-view-actions">
        {#if allowCustomPasscode}
          <button
            type="button"
            class="accent-action-btn"
            onclick={startCustomPasscode}
            disabled={customPasscodeConfirm ? false : !canUseCustomUnlock}
          >
            {customPasscodeConfirm ? t('useCustomPasscodeSave') : t('useCustomPasscodeUnlock')}
          </button>
        {/if}

        <PasscodePad
          bind:this={passcodePad}
          showAutoFocusToggle
          title={t('enterPasscode')}
          subtitle={t('passcodeUnlockHint')}
          error={error}
          onComplete={handleSavedPasscodeComplete}
          onCancel={handleClose}
        />
      </div>
    {/if}
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    border: none;
    background: var(--overlay);
    z-index: 50;
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
    width: min(92vw, 420px);
    max-height: 90vh;
    overflow-y: auto;
    padding: 1.5rem;
    border: 1px solid var(--border);
    border-radius: 20px;
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    z-index: 51;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .modal-header h2,
  h2 {
    margin: 0 0 0.35rem;
    font-size: 1.2rem;
  }

  .modal-header p,
  .empty {
    margin: 0 0 1rem;
    color: var(--text-muted);
    font-size: 0.9rem;
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

  .key-picker-wrap {
    margin-bottom: 0.75rem;
  }

  .key-picker {
    --key-item-height: 3.25rem;
    --key-gap: 0.5rem;
    display: grid;
    gap: var(--key-gap);
    max-height: calc(var(--key-item-height) * 3 + var(--key-gap) * 2);
    overflow-y: auto;
    padding-right: 0.15rem;
  }

  .key-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    min-height: var(--key-item-height);
    padding: 0.8rem 1rem;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--bg);
    cursor: pointer;
    text-align: left;
    flex-shrink: 0;
  }

  .key-option.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--input-focus-ring);
  }

  .key-option strong {
    color: var(--text);
  }

  .key-option span {
    color: var(--text-muted);
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

  .custom-view,
  .saved-view-actions {
    width: 100%;
  }

  .custom-view :global(.passcode-pad),
  .saved-view-actions :global(.passcode-pad) {
    width: 100%;
    max-width: none;
    margin: 0;
  }

  .accent-action-btn {
    display: block;
    width: 100%;
    box-sizing: border-box;
    margin: 0 0 1rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--accent);
    border-radius: 12px;
    background: rgba(245, 158, 11, 0.08);
    color: var(--accent);
    font-size: 0.875rem;
    font-weight: 700;
    text-align: center;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }

  .accent-action-btn:hover:not(:disabled) {
    background: rgba(245, 158, 11, 0.14);
  }

  .accent-action-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  :global([data-theme='dark']) .accent-action-btn {
    background: rgba(245, 158, 11, 0.12);
  }

  :global([data-theme='dark']) .accent-action-btn:hover:not(:disabled) {
    background: rgba(245, 158, 11, 0.18);
  }

  .primary-btn,
  .ghost-btn {
    width: 100%;
    border: none;
    border-radius: 10px;
    padding: 0.75rem 1rem;
    font-weight: 600;
    cursor: pointer;
  }

  .primary-btn {
    margin-top: 0.25rem;
    background: linear-gradient(135deg, var(--accent), #f97316);
    color: white;
  }

  .ghost-btn {
    margin-top: 0.5rem;
    background: var(--bg);
    color: var(--text);
    border: 1px solid var(--border);
  }
</style>
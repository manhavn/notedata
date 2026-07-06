<script lang="ts">
  import { decryptContent, encryptContent, isNoteEncrypted } from '../crypto'
  import { formatAppDate, t } from '../i18n.svelte'
  import { portal } from '../portal'
  import type { Note } from '../types'
  import KeySelectModal, { type PasscodeSubmit } from './KeySelectModal.svelte'

  interface SavePayload {
    title: string
    content: string
    encrypted: boolean
    keyId?: string
  }

  interface Props {
    note: Note | null
    onSave: (payload: SavePayload) => void | Promise<void>
    saving: boolean
    readonly?: boolean
    deletedAt?: number
    onRestore?: () => void
    onPermanentDelete?: () => void
    onManageKeys?: () => void
    emptyTitle?: string
    emptyDescription?: string
  }

  let {
    note,
    onSave,
    saving,
    readonly = false,
    deletedAt,
    onRestore,
    onPermanentDelete,
    onManageKeys,
    emptyTitle = '',
    emptyDescription = '',
  }: Props = $props()

  let title = $state('')
  let plainContent = $state('')
  let lastLoadedId = $state<string | null>(null)
  let isUnlocked = $state(false)
  let keyModalOpen = $state(false)
  let keyModalMode = $state<'unlock' | 'save'>('unlock')
  let decryptError = $state<string | null>(null)

  const resolvedEmptyTitle = $derived(emptyTitle || t('selectOrCreateNote'))
  const resolvedEmptyDescription = $derived(emptyDescription || t('selectOrCreateNoteHint'))
  const noteIsEncrypted = $derived(note ? isNoteEncrypted(note) : false)
  const showLockedState = $derived(Boolean(note && noteIsEncrypted && !isUnlocked))

  $effect(() => {
    if (!note) {
      title = ''
      plainContent = ''
      lastLoadedId = null
      isUnlocked = false
      decryptError = null
      keyModalOpen = false
      return
    }

    if (note.id !== lastLoadedId) {
      title = note.title
      plainContent = ''
      lastLoadedId = note.id
      isUnlocked = !isNoteEncrypted(note)
      decryptError = null
      keyModalOpen = false
    }
  })

  function openUnlockModal() {
    if (keyModalOpen) return
    keyModalMode = 'unlock'
    decryptError = null
    keyModalOpen = true
  }

  function openSaveModal() {
    if (!plainContent.trim()) {
      void persistNote({ encrypted: false })
      return
    }
    if (keyModalOpen) return
    keyModalMode = 'save'
    decryptError = null
    keyModalOpen = true
  }

  async function handleUnlockSuccess(payload: PasscodeSubmit) {
    keyModalOpen = false
    if (!note) return

    try {
      plainContent = await decryptContent(note.content, payload.code, payload.keyId)
      isUnlocked = true
      decryptError = null
    } catch {
      decryptError = t('wrongPasscode')
    }
  }

  async function handleSaveSuccess(payload: PasscodeSubmit) {
    keyModalOpen = false
    if (!note) return

    try {
      const encryptedContent = await encryptContent(plainContent, payload.code, payload.keyId)
      await persistNote({
        content: encryptedContent,
        encrypted: true,
        keyId: payload.keyId,
      })
      decryptError = null
    } catch {
      decryptError = t('wrongPasscode')
    }
  }

  async function persistNote(options: {
    content?: string
    encrypted: boolean
    keyId?: string
  }) {
    if (!note) return
    await onSave({
      title,
      content: options.content ?? plainContent,
      encrypted: options.encrypted,
      keyId: options.keyId,
    })
    if (options.encrypted) {
      isUnlocked = false
      plainContent = ''
    }
  }

  async function saveWithoutEncryption() {
    keyModalOpen = false
    await persistNote({ encrypted: false, keyId: undefined })
  }
</script>

<section class="editor">
  {#if note}
    <div class="editor-header">
      <input
        type="text"
        class="title-input"
        bind:value={title}
        placeholder={t('noteTitle')}
        readonly={readonly}
      />
      <div class="meta">
        <div class="meta-info">
          <span>{t('updatedAt', { date: formatAppDate(note.updatedAt) })}</span>
          {#if noteIsEncrypted}
            <span class="encrypted-badge">🔒 {t('encryptedNote')}</span>
          {/if}
          {#if deletedAt}
            <span class="deleted-at">{t('deletedAt', { date: formatAppDate(deletedAt) })}</span>
          {/if}
        </div>
        {#if readonly}
          <div class="trash-actions">
            <button type="button" class="restore-btn" onclick={onRestore}>
              {t('restore')}
            </button>
            <button type="button" class="delete-btn" onclick={onPermanentDelete}>
              {t('permanentDelete')}
            </button>
          </div>
        {:else}
          <button type="button" class="save-btn" onclick={openSaveModal} disabled={saving || showLockedState}>
            {saving ? t('saving') : t('save')}
          </button>
        {/if}
      </div>
      {#if decryptError && !showLockedState}
        <p class="crypto-error">{decryptError}</p>
      {/if}
    </div>

    {#if showLockedState}
      <div class="locked-panel">
        <div class="locked-icon">🔒</div>
        <h3>{t('encryptedNote')}</h3>
        <p>{t('lockedContentHint')}</p>
        {#if decryptError}
          <p class="error">{decryptError}</p>
        {/if}
        <button type="button" class="unlock-btn" onclick={openUnlockModal}>
          {t('unlockNote')}
        </button>
      </div>
    {:else}
      <textarea
        class="content-input"
        class:readonly
        bind:value={plainContent}
        placeholder={t('noteContentPlaceholder')}
        readonly={readonly}
      ></textarea>
    {/if}
  {:else}
    <div class="placeholder">
      <div class="placeholder-icon">{readonly ? '🗑' : '📝'}</div>
      <h3>{resolvedEmptyTitle}</h3>
      <p>{resolvedEmptyDescription}</p>
    </div>
  {/if}
</section>

{#if keyModalOpen}
  <div class="key-modal-layer" use:portal>
    <KeySelectModal
      open={true}
      title={keyModalMode === 'unlock' ? t('selectKeyToUnlock') : t('selectKeyToEncrypt')}
      subtitle={keyModalMode === 'save' ? t('saveEncryptedHint') : ''}
      suggestedKeyId={note?.keyId ?? null}
      noteKeyId={note?.keyId ?? null}
      customPasscodeConfirm={keyModalMode === 'save'}
      onClose={() => (keyModalOpen = false)}
      onSuccess={keyModalMode === 'unlock' ? handleUnlockSuccess : handleSaveSuccess}
      onManageKeys={onManageKeys}
    />

    {#if keyModalMode === 'save'}
      <button type="button" class="save-plain-floating" onclick={saveWithoutEncryption}>
        {t('saveWithoutEncryption')}
      </button>
    {/if}
  </div>
{/if}

<style>
  .editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg);
    position: relative;
  }

  .editor-header {
    padding: 1.5rem 2rem 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }

  .title-input {
    width: 100%;
    border: none;
    background: transparent;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 0.75rem;
  }

  .title-input:focus {
    outline: none;
  }

  .title-input::placeholder {
    color: var(--text-muted);
    opacity: 0.5;
  }

  .meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .meta-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .meta-info span,
  .deleted-at {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .crypto-error {
    width: 100%;
    margin: 0;
    font-size: 0.85rem;
    color: var(--danger);
    text-align: right;
  }

  .encrypted-badge {
    color: var(--accent) !important;
    font-weight: 600;
  }

  .deleted-at {
    color: var(--danger);
  }

  .trash-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .restore-btn,
  .delete-btn,
  .save-btn,
  .unlock-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .restore-btn {
    background: var(--success);
    color: white;
  }

  .delete-btn {
    background: var(--danger-bg);
    color: var(--danger);
  }

  .save-btn,
  .unlock-btn {
    background: var(--accent);
    color: white;
  }

  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .locked-panel {
    position: relative;
    z-index: 1;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2rem;
    color: var(--text-muted);
  }

  .unlock-btn {
    position: relative;
    z-index: 2;
  }

  .locked-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .locked-panel h3 {
    margin: 0 0 0.5rem;
    color: var(--text);
  }

  .locked-panel p {
    margin: 0 0 1rem;
    max-width: 360px;
    line-height: 1.6;
  }

  .error {
    color: var(--danger);
    font-size: 0.9rem;
  }

  .content-input {
    flex: 1;
    width: 100%;
    padding: 2rem;
    border: none;
    background: transparent;
    color: var(--text);
    font-size: 1rem;
    line-height: 1.7;
    resize: none;
    font-family: inherit;
  }

  .content-input:focus {
    outline: none;
  }

  .content-input::placeholder {
    color: var(--text-muted);
    opacity: 0.5;
  }

  .content-input.readonly {
    cursor: default;
    opacity: 0.85;
  }

  .title-input:read-only {
    cursor: default;
    opacity: 0.9;
  }

  .placeholder {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 2rem;
    color: var(--text-muted);
  }

  .placeholder-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.6;
  }

  .placeholder h3 {
    margin: 0 0 0.5rem;
    color: var(--text);
    font-size: 1.25rem;
  }

  .placeholder p {
    margin: 0;
    font-size: 0.95rem;
  }

  .key-modal-layer {
    position: relative;
    z-index: 50;
  }

  .save-plain-floating {
    position: fixed;
    left: 50%;
    bottom: 1.5rem;
    transform: translateX(-50%);
    z-index: 52;
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.65rem 1rem;
    background: var(--surface);
    color: var(--text-muted);
    font-size: 0.85rem;
    cursor: pointer;
    box-shadow: var(--shadow-lg);
  }
</style>
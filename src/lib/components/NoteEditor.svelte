<script lang="ts">
  import { decryptContent, encryptContent, isNoteEncrypted } from '../crypto'
  import {
    clearDraftContent,
    draftContentStore,
    setDraftContent,
  } from '../draft-content'
  import { formatAppDate, t } from '../i18n.svelte'
  import { renderMarkdown } from '../markdown'
  import { portal } from '../portal'
  import { normalizeTags } from '../notes'
  import type { Note } from '../types'
  import KeySelectModal, { type PasscodeSubmit } from './KeySelectModal.svelte'

  interface SavePayload {
    title: string
    content: string
    tags: string[]
    encrypted: boolean
    keyId?: string
  }

  interface Props {
    note: Note | null
    onSave: (payload: SavePayload) => void | Promise<void>
    onSaveTags?: (tags: string[]) => void | Promise<void>
    saving: boolean
    readonly?: boolean
    deletedAt?: number
    onRestore?: () => void
    onDelete?: () => void
    onPermanentDelete?: () => void
    onManageKeys?: () => void
    emptyTitle?: string
    emptyDescription?: string
  }

  let {
    note,
    onSave,
    onSaveTags,
    saving,
    readonly = false,
    deletedAt,
    onRestore,
    onDelete,
    onPermanentDelete,
    onManageKeys,
    emptyTitle = '',
    emptyDescription = '',
  }: Props = $props()

  let title = $state('')
  let tags = $state<string[]>([])
  let tagInput = $state('')
  let plainContent = $state('')
  let lastLoadedId = $state<string | null>(null)
  let savedPlainSnapshot = $state<string | null>(null)
  let isUnlocked = $state(false)
  let keyModalOpen = $state(false)
  let keyModalMode = $state<'unlock' | 'save'>('unlock')
  let decryptError = $state<string | null>(null)
  let markdownView = $state(false)
  let headerCollapsed = $state(false)

  const resolvedEmptyTitle = $derived(emptyTitle || t('selectOrCreateNote'))
  const resolvedEmptyDescription = $derived(emptyDescription || t('selectOrCreateNoteHint'))
  const noteIsEncrypted = $derived(note ? isNoteEncrypted(note) : false)
  const hasDraft = $derived(note ? note.id in $draftContentStore : false)
  const hasUnsavedChanges = $derived(hasDraft)
  const showLockedState = $derived(
    Boolean(note && noteIsEncrypted && !isUnlocked && !hasDraft),
  )
  const renderedMarkdown = $derived(renderMarkdown(plainContent))

  $effect(() => {
    if (!note) {
      title = ''
      tags = []
      tagInput = ''
      plainContent = ''
      lastLoadedId = null
      savedPlainSnapshot = null
      isUnlocked = false
      decryptError = null
      keyModalOpen = false
      markdownView = false
      headerCollapsed = false
      return
    }

    if (note.id !== lastLoadedId) {
      title = note.title
      tags = note.tags ? [...note.tags] : []
      tagInput = ''
      lastLoadedId = note.id
      decryptError = null
      keyModalOpen = false
      markdownView = false
      headerCollapsed = false

      const draft = $draftContentStore[note.id]
      if (draft !== undefined) {
        plainContent = draft
        savedPlainSnapshot = null
        isUnlocked = true
      } else if (!isNoteEncrypted(note)) {
        plainContent = note.content
        savedPlainSnapshot = note.content
        isUnlocked = true
      } else {
        plainContent = ''
        savedPlainSnapshot = null
        isUnlocked = false
      }
    }
  })

  $effect(() => {
    if (!note || readonly || note.id !== lastLoadedId) return

    const noteId = note.id
    const content = plainContent
    const draft = $draftContentStore[noteId]

    if (draft !== undefined) {
      const matchesSaved =
        savedPlainSnapshot !== null
          ? content === savedPlainSnapshot
          : !isNoteEncrypted(note) && content === note.content

      if (matchesSaved) {
        clearDraftContent(noteId)
      } else if (draft !== content) {
        setDraftContent(noteId, content)
      }
      return
    }

    if (savedPlainSnapshot !== null) {
      if (content !== savedPlainSnapshot) {
        setDraftContent(noteId, content)
      }
      return
    }

    if (!isNoteEncrypted(note) && content !== note.content) {
      setDraftContent(noteId, content)
    }
  })

  function toggleMarkdownView() {
    markdownView = !markdownView
  }

  function toggleHeaderCollapse() {
    headerCollapsed = !headerCollapsed
  }

  function cancelEdit() {
    if (!note || readonly || !hasUnsavedChanges) return

    clearDraftContent(note.id)

    if (!isNoteEncrypted(note)) {
      plainContent = note.content
      savedPlainSnapshot = note.content
      isUnlocked = true
    } else if (savedPlainSnapshot !== null) {
      plainContent = savedPlainSnapshot
      isUnlocked = true
    } else {
      plainContent = ''
      savedPlainSnapshot = null
      isUnlocked = false
    }

    markdownView = false
    decryptError = null
  }

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
      const decrypted = await decryptContent(note.content, payload.code, payload.keyId)
      plainContent = decrypted
      savedPlainSnapshot = decrypted
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
      tags,
      encrypted: options.encrypted,
      keyId: options.keyId,
    })
    clearDraftContent(note.id)

    if (options.encrypted) {
      isUnlocked = false
      plainContent = ''
      savedPlainSnapshot = null
    } else {
      savedPlainSnapshot = options.content ?? plainContent
    }
  }

  async function saveWithoutEncryption() {
    keyModalOpen = false
    await persistNote({ encrypted: false, keyId: undefined })
  }

  function tagsEqual(left: string[], right: string[]) {
    return left.length === right.length && left.every((tag, index) => tag === right[index])
  }

  async function saveTags() {
    if (!note || readonly || !onSaveTags) return
    await onSaveTags([...tags])
  }

  async function addTagsFromInput() {
    if (!tagInput.trim()) return

    const nextTags = normalizeTags([...tags, ...tagInput.split(',')])
    const changed = !tagsEqual(nextTags, tags)

    tags = nextTags
    tagInput = ''

    if (changed) {
      await saveTags()
    }
  }

  function handleTagInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      void addTagsFromInput()
    }
  }

  async function removeTag(tag: string) {
    const nextTags = tags.filter((item) => item !== tag)
    if (tagsEqual(nextTags, tags)) return

    tags = nextTags
    await saveTags()
  }
</script>

<section class="editor">
  {#if note}
    <div class="header-collapse-wrap">
      <button
        type="button"
        class="header-collapse-btn"
        class:collapsed={headerCollapsed}
        onclick={toggleHeaderCollapse}
        aria-label={headerCollapsed ? t('expandHeader') : t('collapseHeader')}
        title={headerCollapsed ? t('expandHeader') : t('collapseHeader')}
      >
        <svg class="header-collapse-icon" viewBox="0 0 24 24" aria-hidden="true">
          {#if headerCollapsed}
            <path
              d="M6 9l6 6 6-6"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          {:else}
            <path
              d="M6 15l6-6 6 6"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          {/if}
        </svg>
      </button>
      {#if hasUnsavedChanges && !readonly}
        <span
          class="header-unsaved-dot"
          title={t('unsavedContent')}
          aria-label={t('unsavedContent')}
        ></span>
      {/if}
    </div>
    <div class="editor-header" class:collapsed={headerCollapsed}>
      <input
        type="text"
        class="title-input"
        bind:value={title}
        placeholder={t('noteTitle')}
        readonly={readonly}
      />
      <div class="tags-row">
        {#if tags.length > 0}
          <div class="tag-list">
            {#each tags as tag (tag)}
              <span class="tag-chip">
                {tag}
                {#if !readonly}
                  <button
                    type="button"
                    class="tag-remove"
                    onclick={() => removeTag(tag)}
                    aria-label={t('removeTag', { tag })}
                  >
                    ×
                  </button>
                {/if}
              </span>
            {/each}
          </div>
        {/if}
        {#if !readonly}
          <input
            type="text"
            class="tag-input"
            bind:value={tagInput}
            placeholder={t('noteTagsPlaceholder')}
            onkeydown={handleTagInputKeydown}
            onblur={() => void addTagsFromInput()}
          />
        {:else if tags.length === 0}
          <span class="no-tags">{t('noTags')}</span>
        {/if}
      </div>
      <div class="meta">
        <div class="meta-info">
          <span>{t('updatedAt', { date: formatAppDate(note.updatedAt) })}</span>
          {#if hasUnsavedChanges && !readonly}
            <span class="draft-badge">
              <svg class="draft-badge-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
                <path
                  d="M14 2v6h6M12 18v-6M9 15h6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              {t('unsavedContent')}
            </span>
          {:else if noteIsEncrypted}
            <span class="encrypted-badge">🔒 {t('encryptedNote')}</span>
          {/if}
          {#if deletedAt}
            <span class="deleted-at">{t('deletedAt', { date: formatAppDate(deletedAt) })}</span>
          {/if}
        </div>
        {#if readonly}
          <div class="trash-actions">
            <button
              type="button"
              class="markdown-btn"
              class:active={markdownView}
              onclick={toggleMarkdownView}
              disabled={showLockedState}
            >
              {markdownView ? t('editMode') : t('viewMarkdown')}
            </button>
            <button type="button" class="restore-btn" onclick={onRestore}>
              {t('restore')}
            </button>
            <button type="button" class="delete-btn" onclick={onPermanentDelete}>
              {t('permanentDelete')}
            </button>
          </div>
        {:else}
          <div class="editor-actions">
            {#if onDelete}
              <button
                type="button"
                class="delete-btn"
                onclick={onDelete}
                title={t('moveToTrash')}
                aria-label={t('deleteNote')}
              >
                {t('deleteNote')}
              </button>
            {/if}
            <button
              type="button"
              class="cancel-edit-btn"
              onclick={cancelEdit}
              disabled={!hasUnsavedChanges}
            >
              {t('cancelEdit')}
            </button>
            <button
              type="button"
              class="markdown-btn"
              class:active={markdownView}
              onclick={toggleMarkdownView}
              disabled={showLockedState}
            >
              {markdownView ? t('editMode') : t('viewMarkdown')}
            </button>
            <button
              type="button"
              class="save-btn"
              class:unsaved={hasUnsavedChanges}
              onclick={openSaveModal}
              disabled={saving || showLockedState}
            >
              {saving ? t('saving') : t('save')}
            </button>
          </div>
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
    {:else if markdownView}
      <div class="markdown-preview">
        {#if plainContent.trim()}
          <div class="markdown-body">{@html renderedMarkdown}</div>
        {:else}
          <p class="markdown-empty">{t('noteContentPlaceholder')}</p>
        {/if}
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

  .header-collapse-wrap {
    position: absolute;
    top: 0;
    left: 50%;
    z-index: 2;
    display: flex;
    align-items: flex-start;
    gap: 0.35rem;
    transform: translateX(-50%);
  }

  .header-unsaved-dot {
    flex-shrink: 0;
    width: 0.5rem;
    height: 0.5rem;
    margin-top: 0.18rem;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 2px var(--surface);
  }

  .header-collapse-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 0.85rem;
    padding: 0;
    border: 1px solid var(--border);
    border-top: none;
    border-radius: 0 0 6px 6px;
    background: var(--surface);
    color: var(--text-muted);
    cursor: pointer;
    transition:
      color 0.2s,
      background 0.2s,
      border-color 0.2s,
      box-shadow 0.2s;
  }

  .header-collapse-btn.collapsed {
    border-top: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
  }

  .header-collapse-btn:hover {
    color: var(--text);
    background: var(--bg);
    border-color: var(--accent);
  }

  .header-collapse-icon {
    width: 0.85rem;
    height: 0.85rem;
  }

  .editor-header {
    flex-shrink: 0;
    padding: 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    overflow: hidden;
    transition:
      max-height 0.25s ease,
      padding 0.25s ease,
      opacity 0.2s ease,
      border-width 0.25s ease,
      border-color 0.25s ease;
    max-height: 40rem;
  }

  .editor-header.collapsed {
    max-height: 0;
    padding: 0;
    margin: 0;
    opacity: 0;
    border-bottom-width: 0;
    pointer-events: none;
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

  .tags-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--text-muted) 14%, transparent);
    color: var(--text-muted);
    font-size: 0.8rem;
    font-weight: 600;
  }

  .tag-remove {
    border: none;
    background: transparent;
    color: inherit;
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    padding: 0;
    opacity: 0.7;
  }

  .tag-remove:hover {
    opacity: 1;
  }

  .tag-input {
    flex: 1;
    min-width: 180px;
    padding: 0.35rem 0.65rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font-size: 0.85rem;
  }

  .tag-input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .tag-input::placeholder {
    color: var(--text-muted);
    opacity: 0.6;
  }

  .no-tags {
    font-size: 0.85rem;
    color: var(--text-muted);
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

  .encrypted-badge,
  .draft-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--accent) !important;
    font-weight: 600;
  }

  .draft-badge-icon {
    width: 0.9rem;
    height: 0.9rem;
    flex-shrink: 0;
  }

  .deleted-at {
    color: var(--danger);
  }

  .trash-actions,
  .editor-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .restore-btn,
  .delete-btn,
  .save-btn,
  .cancel-edit-btn,
  .markdown-btn,
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

  .unlock-btn {
    background: var(--accent);
    color: white;
  }

  .save-btn {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
  }

  .save-btn.unsaved {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }

  .cancel-edit-btn,
  .markdown-btn {
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
  }

  .markdown-btn.active {
    border-color: var(--accent);
    color: var(--accent);
  }

  .save-btn:disabled,
  .cancel-edit-btn:disabled,
  .markdown-btn:disabled {
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
    padding: 1rem;
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

  .markdown-preview {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .markdown-empty {
    margin: 0;
    color: var(--text-muted);
    opacity: 0.5;
    font-size: 1rem;
    line-height: 1.7;
  }

  .markdown-body {
    color: var(--text);
    font-size: 1rem;
    line-height: 1.7;
    word-break: break-word;
  }

  .markdown-body :global(h1),
  .markdown-body :global(h2),
  .markdown-body :global(h3),
  .markdown-body :global(h4),
  .markdown-body :global(h5),
  .markdown-body :global(h6) {
    margin: 1.5rem 0 0.75rem;
    line-height: 1.3;
    font-weight: 700;
    color: var(--text);
  }

  .markdown-body :global(h1) {
    font-size: 1.75rem;
  }

  .markdown-body :global(h2) {
    font-size: 1.5rem;
  }

  .markdown-body :global(h3) {
    font-size: 1.25rem;
  }

  .markdown-body :global(p),
  .markdown-body :global(ul),
  .markdown-body :global(ol),
  .markdown-body :global(blockquote),
  .markdown-body :global(pre) {
    margin: 0 0 1rem;
  }

  .markdown-body :global(ul),
  .markdown-body :global(ol) {
    padding-left: 1.5rem;
  }

  .markdown-body :global(blockquote) {
    border-left: 3px solid var(--accent);
    padding-left: 1rem;
    color: var(--text-muted);
  }

  .markdown-body :global(code) {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.9em;
    background: var(--border);
    padding: 0.15em 0.35em;
    border-radius: 4px;
  }

  .markdown-body :global(pre) {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
    overflow-x: auto;
  }

  .markdown-body :global(pre code) {
    background: transparent;
    padding: 0;
  }

  .markdown-body :global(a) {
    color: var(--accent);
    text-decoration: underline;
  }

  .markdown-body :global(hr) {
    border: none;
    border-top: 1px solid var(--border);
    margin: 1.5rem 0;
  }

  .markdown-body :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 1rem;
  }

  .markdown-body :global(th),
  .markdown-body :global(td) {
    border: 1px solid var(--border);
    padding: 0.5rem 0.75rem;
    text-align: left;
  }

  .markdown-body :global(th) {
    background: var(--surface);
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
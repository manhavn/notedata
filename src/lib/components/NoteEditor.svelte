<script lang="ts">
  import { formatAppDate, t } from '../i18n.svelte'
  import type { Note } from '../types'

  interface Props {
    note: Note | null
    onSave: (title: string, content: string) => void
    saving: boolean
    readonly?: boolean
    deletedAt?: number
    onRestore?: () => void
    onPermanentDelete?: () => void
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
    emptyTitle = '',
    emptyDescription = '',
  }: Props = $props()

  let title = $state('')
  let content = $state('')
  let lastSavedId = $state<string | null>(null)

  const resolvedEmptyTitle = $derived(emptyTitle || t('selectOrCreateNote'))
  const resolvedEmptyDescription = $derived(emptyDescription || t('selectOrCreateNoteHint'))

  $effect(() => {
    if (note && note.id !== lastSavedId) {
      title = note.title
      content = note.content
      lastSavedId = note.id
    } else if (!note) {
      lastSavedId = null
    }
  })

  function handleSave() {
    if (!note) return
    onSave(title, content)
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
          <button type="button" class="save-btn" onclick={handleSave} disabled={saving}>
            {saving ? t('saving') : t('save')}
          </button>
        {/if}
      </div>
    </div>

    <textarea
      class="content-input"
      class:readonly
      bind:value={content}
      placeholder={t('noteContentPlaceholder')}
      readonly={readonly}
    ></textarea>
  {:else}
    <div class="placeholder">
      <div class="placeholder-icon">{readonly ? '🗑' : '📝'}</div>
      <h3>{resolvedEmptyTitle}</h3>
      <p>{resolvedEmptyDescription}</p>
    </div>
  {/if}
</section>

<style>
  .editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg);
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

  .deleted-at {
    color: var(--danger);
  }

  .trash-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .restore-btn,
  .delete-btn {
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

  .restore-btn:hover,
  .delete-btn:hover {
    opacity: 0.9;
  }

  .save-btn {
    padding: 0.5rem 1.25rem;
    border: none;
    border-radius: 8px;
    background: var(--accent);
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .save-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
</style>
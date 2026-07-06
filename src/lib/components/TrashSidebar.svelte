<script lang="ts">
  import { isNoteEncrypted } from '../crypto'
  import { formatAppDate, t } from '../i18n.svelte'
  import { PAGE_SIZE } from '../pagination'
  import type { TrashedNote } from '../types'

  interface Props {
    notes: TrashedNote[]
    selectedId: string | null
    checkedIds: Set<string>
    onSelect: (id: string) => void
    onRestore: (id: string) => void
    onPermanentDelete: (id: string) => void
    onEmptyTrash: () => void
    onBack: () => void
    onToggleCheck: (id: string) => void
    onCheckIds: (ids: string[]) => void
    onUncheckIds: (ids: string[]) => void
    onClearSelection: () => void
    onBulkRestore: () => void
    onBulkPermanentDelete: () => void
  }

  let {
    notes,
    selectedId,
    checkedIds,
    onSelect,
    onRestore,
    onPermanentDelete,
    onEmptyTrash,
    onBack,
    onToggleCheck,
    onCheckIds,
    onUncheckIds,
    onClearSelection,
    onBulkRestore,
    onBulkPermanentDelete,
  }: Props = $props()

  let displayLimit = $state(PAGE_SIZE)

  const visibleNotes = $derived(notes.slice(0, displayLimit))
  const hasMore = $derived(notes.length > displayLimit)
  const visibleIds = $derived(visibleNotes.map((note) => note.id))
  const checkedCount = $derived(checkedIds.size)
  const allVisibleChecked = $derived(
    visibleNotes.length > 0 && visibleNotes.every((note) => checkedIds.has(note.id)),
  )
  const someVisibleChecked = $derived(
    visibleNotes.some((note) => checkedIds.has(note.id)) && !allVisibleChecked,
  )

  function preview(note: TrashedNote) {
    if (isNoteEncrypted(note)) {
      return `🔒 ${t('encryptedContent')}`
    }
    const text = note.content.trim()
    return text.length > 80 ? `${text.slice(0, 80)}...` : text || t('noContent')
  }

  function handleSelectAllChange() {
    if (allVisibleChecked) {
      onUncheckIds(visibleIds)
    } else {
      onCheckIds(visibleIds)
    }
  }

  function loadMore() {
    displayLimit += PAGE_SIZE
  }
</script>

<aside class="sidebar">
  <div class="sidebar-header">
    <button type="button" class="back-btn" onclick={onBack} title={t('backToNotes')}>
      ←
    </button>
    <div class="header-text">
      <h2>{t('trash')}</h2>
      <span class="count">{t('noteCount', { count: notes.length })}</span>
    </div>
  </div>

  {#if checkedCount > 0}
    <div class="bulk-bar">
      <span class="bulk-count">{t('selectedCount', { count: checkedCount })}</span>
      <div class="bulk-actions">
        <button type="button" class="bulk-btn success" onclick={onBulkRestore}>
          {t('bulkRestore')}
        </button>
        <button type="button" class="bulk-btn danger" onclick={onBulkPermanentDelete}>
          {t('bulkPermanentDelete')}
        </button>
        <button type="button" class="bulk-btn ghost" onclick={onClearSelection}>
          {t('clearSelection')}
        </button>
      </div>
    </div>
  {:else if notes.length > 0}
    <div class="actions">
      <button type="button" class="empty-btn" onclick={onEmptyTrash}>
        {t('emptyTrash')}
      </button>
    </div>
  {/if}

  <div class="note-list">
    {#if notes.length === 0}
      <p class="empty">{t('trashEmpty')}</p>
    {:else}
      <label class="select-all">
        <input
          type="checkbox"
          checked={allVisibleChecked}
          indeterminate={someVisibleChecked}
          onchange={handleSelectAllChange}
        />
        <span>{t('selectAll', { count: visibleNotes.length })}</span>
      </label>

      {#each visibleNotes as note (note.id)}
        <div
          class="note-item"
          class:selected={note.id === selectedId}
          class:checked={checkedIds.has(note.id)}
          title={note.title}
        >
          <div class="checkbox-wrap">
            <input
              type="checkbox"
              checked={checkedIds.has(note.id)}
              onclick={(e) => e.stopPropagation()}
              onchange={() => onToggleCheck(note.id)}
            />
          </div>
          <button type="button" class="note-btn" onclick={() => onSelect(note.id)}>
            <span class="title">{note.title}</span>
            <span class="preview">{preview(note)}</span>
            <span class="date">{t('deletedAt', { date: formatAppDate(note.deletedAt) })}</span>
          </button>
          <div class="item-actions">
            <button
              type="button"
              class="restore-btn"
              onclick={() => onRestore(note.id)}
              title={t('restore')}
              aria-label={t('restoreNote')}
            >
              ↩
            </button>
            <button
              type="button"
              class="delete-btn"
              onclick={() => onPermanentDelete(note.id)}
              title={t('permanentDelete')}
              aria-label={t('permanentDeleteNote')}
            >
              ×
            </button>
          </div>
        </div>
      {/each}

      {#if hasMore}
        <div class="load-more-wrap">
          <p class="load-more-info">{t('showingCount', { visible: visibleNotes.length, total: notes.length })}</p>
          <button type="button" class="load-more-btn" onclick={loadMore}>
            {t('loadMore')}
          </button>
        </div>
      {/if}
    {/if}
  </div>
</aside>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--surface);
    border-right: 1px solid var(--border);
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1.25rem 1rem 1rem;
    border-bottom: 1px solid var(--border);
  }

  .back-btn {
    width: 36px;
    height: 36px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    color: var(--text);
    font-size: 1.1rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .back-btn:hover {
    background: var(--surface);
  }

  .header-text h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
  }

  .count {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .bulk-bar {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border);
    background: rgba(239, 68, 68, 0.05);
  }

  .bulk-count {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text);
  }

  .bulk-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .bulk-btn {
    padding: 0.4rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
  }

  .bulk-btn.success {
    border-color: rgba(34, 197, 94, 0.25);
    background: rgba(34, 197, 94, 0.08);
    color: var(--success);
  }

  .bulk-btn.danger {
    border-color: rgba(239, 68, 68, 0.25);
    background: rgba(239, 68, 68, 0.08);
    color: var(--danger);
  }

  .bulk-btn.ghost {
    background: transparent;
  }

  .actions {
    padding: 0.75rem 1rem 0;
  }

  .empty-btn {
    width: 100%;
    padding: 0.6rem 0.85rem;
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 10px;
    background: rgba(239, 68, 68, 0.06);
    color: var(--danger);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .empty-btn:hover {
    background: rgba(239, 68, 68, 0.12);
  }

  .note-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem;
  }

  .select-all {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.75rem 0.75rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
    cursor: pointer;
  }

  .select-all input,
  .checkbox-wrap input {
    width: 16px;
    height: 16px;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .empty {
    margin: 2rem 1rem;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .note-item {
    display: flex;
    align-items: stretch;
    gap: 0.35rem;
    margin-bottom: 0.5rem;
    border-radius: 12px;
    overflow: hidden;
    transition: background 0.2s;
  }

  .note-item.selected {
    background: rgba(239, 68, 68, 0.06);
  }

  .note-item.checked {
    background: rgba(59, 130, 246, 0.06);
  }

  .checkbox-wrap {
    display: grid;
    place-items: center;
    padding-left: 0.35rem;
    cursor: pointer;
  }

  .note-btn {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    padding: 0.85rem 0.75rem;
    border: none;
    border-radius: 12px;
    background: transparent;
    text-align: left;
    cursor: pointer;
    transition: background 0.2s;
  }

  .note-btn:hover {
    background: var(--bg);
  }

  .title {
    width: 100%;
    font-weight: 600;
    color: var(--text);
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .preview {
    width: 100%;
    font-size: 0.8rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .date {
    font-size: 0.75rem;
    color: var(--text-muted);
    opacity: 0.8;
  }

  .item-actions {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.25rem;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .note-item:hover .item-actions,
  .note-item.selected .item-actions {
    opacity: 1;
  }

  .restore-btn,
  .delete-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .restore-btn {
    color: var(--text-muted);
  }

  .restore-btn:hover {
    background: rgba(34, 197, 94, 0.12);
    color: var(--success);
  }

  .delete-btn {
    color: var(--text-muted);
    font-size: 1.25rem;
  }

  .delete-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    color: var(--danger);
  }

  .load-more-wrap {
    padding: 0.75rem 0.5rem 0.25rem;
    text-align: center;
  }

  .load-more-info {
    margin: 0 0 0.6rem;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .load-more-btn {
    width: 100%;
    padding: 0.65rem 1rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    color: var(--text);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }

  .load-more-btn:hover {
    background: var(--surface);
    border-color: #d6d3d1;
  }
</style>
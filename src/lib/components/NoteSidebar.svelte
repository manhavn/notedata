<script lang="ts">
  import { isNoteEncrypted } from '../crypto'
  import { formatAppDate, t } from '../i18n.svelte'
  import { PAGE_SIZE } from '../pagination'
  import type { Note } from '../types'

  interface Props {
    notes: Note[]
    trashCount: number
    selectedId: string | null
    checkedIds: Set<string>
    onSelect: (id: string) => void
    onCreate: () => void
    onDelete: (id: string) => void
    onOpenTrash: () => void
    onToggleCheck: (id: string) => void
    onCheckIds: (ids: string[]) => void
    onUncheckIds: (ids: string[]) => void
    onClearSelection: () => void
    onBulkDelete: () => void
    onBulkExport: () => void
    onImport: () => void
  }

  let {
    notes,
    trashCount,
    selectedId,
    checkedIds,
    onSelect,
    onCreate,
    onDelete,
    onOpenTrash,
    onToggleCheck,
    onCheckIds,
    onUncheckIds,
    onClearSelection,
    onBulkDelete,
    onBulkExport,
    onImport,
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

  function preview(note: Note) {
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
    <h2>{t('notes')}</h2>
    <div class="header-actions">
      <button type="button" class="icon-btn" onclick={onImport} title={t('importJson')}>
        ↓
      </button>
      <button type="button" class="new-btn" onclick={onCreate} title={t('newNote')}>
        +
      </button>
    </div>
  </div>

  {#if checkedCount > 0}
    <div class="bulk-bar">
      <span class="bulk-count">{t('selectedCount', { count: checkedCount })}</span>
      <div class="bulk-actions">
        <button type="button" class="bulk-btn danger" onclick={onBulkDelete}>
          {t('delete')}
        </button>
        <button type="button" class="bulk-btn" onclick={onBulkExport}>
          {t('export')}
        </button>
        <button type="button" class="bulk-btn ghost" onclick={onClearSelection}>
          {t('clearSelection')}
        </button>
      </div>
    </div>
  {/if}

  <div class="note-list">
    {#if notes.length === 0}
      <p class="empty">{t('notesEmpty')}</p>
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
            <span class="date">{formatAppDate(note.updatedAt)}</span>
          </button>
          <button
            type="button"
            class="delete-btn"
            onclick={() => onDelete(note.id)}
            title={t('moveToTrash')}
            aria-label={t('moveToTrash')}
          >
            ×
          </button>
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

  <div class="sidebar-footer">
    <button type="button" class="trash-btn" onclick={onOpenTrash}>
      <span class="trash-icon">🗑</span>
      <span>{t('trash')}</span>
      {#if trashCount > 0}
        <span class="trash-badge">{trashCount}</span>
      {/if}
    </button>
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
    justify-content: space-between;
    padding: 1.25rem 1rem 1rem;
    border-bottom: 1px solid var(--border);
  }

  .sidebar-header h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .icon-btn {
    width: 36px;
    height: 36px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    color: var(--text);
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s;
  }

  .icon-btn:hover {
    background: var(--surface);
  }

  .new-btn {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 10px;
    background: linear-gradient(135deg, var(--accent), #f97316);
    color: white;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .new-btn:hover {
    transform: scale(1.05);
  }

  .bulk-bar {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border);
    background: rgba(245, 158, 11, 0.06);
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

  .bulk-btn.danger {
    border-color: rgba(239, 68, 68, 0.25);
    background: rgba(239, 68, 68, 0.08);
    color: var(--danger);
  }

  .bulk-btn.ghost {
    background: transparent;
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
    background: rgba(245, 158, 11, 0.08);
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

  .checkbox-wrap input,
  .select-all input {
    width: 16px;
    height: 16px;
    accent-color: var(--accent);
    cursor: pointer;
  }

  .note-btn {
    flex: 1;
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
    font-weight: 600;
    color: var(--text);
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .preview {
    font-size: 0.8rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .date {
    font-size: 0.75rem;
    color: var(--text-muted);
    opacity: 0.8;
  }

  .delete-btn {
    width: 32px;
    align-self: center;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted);
    font-size: 1.25rem;
    cursor: pointer;
    opacity: 0;
    transition: all 0.2s;
  }

  .note-item:hover .delete-btn {
    opacity: 1;
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
    border-color: var(--border);
  }

  .sidebar-footer {
    padding: 0.75rem 1rem 1rem;
    border-top: 1px solid var(--border);
  }

  .trash-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--bg);
    color: var(--text);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }

  .trash-btn:hover {
    background: var(--surface);
    border-color: var(--border);
  }

  .trash-icon {
    font-size: 1rem;
  }

  .trash-badge {
    margin-left: auto;
    min-width: 22px;
    height: 22px;
    padding: 0 0.4rem;
    border-radius: 999px;
    background: rgba(239, 68, 68, 0.12);
    color: var(--danger);
    font-size: 0.75rem;
    font-weight: 700;
    display: grid;
    place-items: center;
  }
</style>
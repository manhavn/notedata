<script lang="ts">
  import { isNoteEncrypted } from '../crypto'
  import { draftContentStore, hasDraftContent, peekDraftContent } from '../draft-content'
  import { userSettingsState } from '../user-settings.svelte'
  import { formatAppDate, localeState, t } from '../i18n.svelte'
  import { sortNotes, type NoteSortOrder } from '../notes'
  import { PAGE_SIZE } from '../pagination'
  import type { Note } from '../types'
  import type { TranslationKey } from '../i18n/translations'

  const SORT_STORAGE_KEY = 'notedata-note-sort'

  const SORT_OPTIONS: { value: NoteSortOrder; labelKey: TranslationKey }[] = [
    { value: 'title-asc', labelKey: 'sortTitleAsc' },
    { value: 'title-desc', labelKey: 'sortTitleDesc' },
    { value: 'create-asc', labelKey: 'sortCreateAsc' },
    { value: 'create-desc', labelKey: 'sortCreateDesc' },
    { value: 'update-asc', labelKey: 'sortUpdateAsc' },
    { value: 'update-desc', labelKey: 'sortUpdateDesc' },
  ]

  function loadSortOrder(): NoteSortOrder {
    const stored = localStorage.getItem(SORT_STORAGE_KEY)
    if (stored === 'time-asc') return 'update-asc'
    if (stored === 'time-desc') return 'update-desc'
    if (
      stored === 'title-asc' ||
      stored === 'title-desc' ||
      stored === 'update-asc' ||
      stored === 'update-desc' ||
      stored === 'create-asc' ||
      stored === 'create-desc'
    ) {
      return stored
    }
    return 'update-desc'
  }

  interface Props {
    notes: Note[]
    trashCount: number
    selectedId: string | null
    checkedIds: Set<string>
    isSearchActive?: boolean
    searching?: boolean
    onSelect: (id: string) => void
    onCreate: () => void
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
    isSearchActive = false,
    searching = false,
    onSelect,
    onCreate,
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
  let sortOrder = $state<NoteSortOrder>(loadSortOrder())
  let sortMenuOpen = $state(false)
  let sortWrapEl = $state<HTMLDivElement | undefined>(undefined)

  const sortedNotes = $derived(
    sortNotes(notes, sortOrder, localeState.locale === 'vi' ? 'vi' : 'en'),
  )
  const visibleNotes = $derived(sortedNotes.slice(0, displayLimit))
  const hasMore = $derived(sortedNotes.length > displayLimit)
  const visibleIds = $derived(visibleNotes.map((note) => note.id))
  const checkedCount = $derived(checkedIds.size)
  const allVisibleChecked = $derived(
    visibleNotes.length > 0 && visibleNotes.every((note) => checkedIds.has(note.id)),
  )
  const someVisibleChecked = $derived(
    visibleNotes.some((note) => checkedIds.has(note.id)) && !allVisibleChecked,
  )
  const draftNoteIds = $derived.by(() => {
    void $draftContentStore
    void userSettingsState.persistNoteDraftLocal
    return new Set(notes.filter((note) => hasDraftContent(note.id)).map((note) => note.id))
  })

  function preview(note: Note) {
    void $draftContentStore
    void userSettingsState.persistNoteDraftLocal
    const draft = peekDraftContent(note.id)
    if (draft !== undefined) {
      const text = draft.trim()
      return text.length > 80 ? `${text.slice(0, 80)}...` : text || t('noContent')
    }

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

  function toggleSortMenu(event: MouseEvent) {
    event.stopPropagation()
    sortMenuOpen = !sortMenuOpen
  }

  function selectSort(order: NoteSortOrder) {
    sortOrder = order
    sortMenuOpen = false
    displayLimit = PAGE_SIZE
    localStorage.setItem(SORT_STORAGE_KEY, order)
  }

  $effect(() => {
    if (!sortMenuOpen) return

    const onPointerDown = (event: MouseEvent) => {
      if (!sortWrapEl?.contains(event.target as Node)) {
        sortMenuOpen = false
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        sortMenuOpen = false
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  })
</script>

<aside class="sidebar">
  <div class="sidebar-header">
    <h2>{t('notes')}</h2>
    <div class="header-actions">
      <div class="sort-wrap" bind:this={sortWrapEl}>
        <button
          type="button"
          class="icon-btn sort-btn"
          class:active={sortMenuOpen}
          onclick={toggleSortMenu}
          title={t('sortNotes')}
          aria-label={t('sortNotes')}
          aria-haspopup="menu"
          aria-expanded={sortMenuOpen}
        >
          <svg class="sort-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M8 9l4-4 4 4M8 15l4 4 4-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        {#if sortMenuOpen}
          <div class="sort-menu" role="menu">
            {#each SORT_OPTIONS as option (option.value)}
              <button
                type="button"
                class="sort-option"
                class:active={sortOrder === option.value}
                role="menuitemradio"
                aria-checked={sortOrder === option.value}
                onclick={() => selectSort(option.value)}
              >
                {t(option.labelKey)}
              </button>
            {/each}
          </div>
        {/if}
      </div>
      <button type="button" class="icon-btn" onclick={onImport} title={t('importJson')} aria-label={t('importJson')}>
        <svg class="import-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 16V4M8 8l4-4 4 4M4 20h16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        class="icon-btn trash-btn"
        onclick={onOpenTrash}
        title={trashCount > 0 ? `${t('trash')} (${trashCount})` : t('trash')}
        aria-label={trashCount > 0 ? `${t('trash')} (${trashCount})` : t('trash')}
      >
        <svg class="trash-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        {#if trashCount > 0}
          <span class="trash-count">{trashCount}</span>
        {/if}
      </button>
      <button
        type="button"
        class="new-btn"
        onclick={onCreate}
        title={t('newNote')}
        aria-label={t('newNote')}
      >
        <svg class="new-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 5v14M5 12h14"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          />
        </svg>
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
    {#if searching && isSearchActive}
      <p class="searching-hint">{t('searching')}</p>
    {/if}

    {#if notes.length === 0}
      <p class="empty">{isSearchActive && !searching ? t('searchNoResults') : t('notesEmpty')}</p>
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
            <span class="title" class:unsaved={draftNoteIds.has(note.id)}>
              {#if draftNoteIds.has(note.id)}
                <span class="unsaved-dot" aria-hidden="true"></span>
              {/if}
              {note.title}
            </span>
            {#if note.tags && note.tags.length > 0}
              <span class="tags">
                {#each note.tags as tag (tag)}
                  <span class="tag">{tag}</span>
                {/each}
              </span>
            {/if}
            <span class="preview">{preview(note)}</span>
            <span class="date">{formatAppDate(note.updatedAt)}</span>
          </button>
        </div>
      {/each}

      {#if hasMore}
        <div class="load-more-wrap">
          <p class="load-more-info">{t('showingCount', { visible: visibleNotes.length, total: sortedNotes.length })}</p>
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
    justify-content: space-between;
    padding: 0.5rem 1rem;
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
    gap: 0.35rem;
  }

  .sort-wrap {
    position: relative;
  }

  .sort-btn.active {
    border-color: var(--accent);
    color: var(--accent);
    background: rgba(245, 158, 11, 0.08);
  }

  .sort-menu {
    position: absolute;
    top: calc(100% + 0.35rem);
    right: 0;
    z-index: 20;
    min-width: 9.5rem;
    padding: 0.3rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    box-shadow: var(--shadow-lg);
  }

  .sort-option {
    display: block;
    width: 100%;
    padding: 0.45rem 0.65rem;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--text);
    font-size: 0.8rem;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .sort-option:hover {
    background: var(--bg);
  }

  .sort-option.active {
    background: rgba(245, 158, 11, 0.12);
    color: var(--accent);
  }

  .icon-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    color: var(--text);
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }

  .icon-btn:hover {
    background: var(--surface);
  }

  .trash-btn:hover {
    border-color: rgba(239, 68, 68, 0.35);
    color: var(--danger);
  }

  .import-icon,
  .trash-icon,
  .sort-icon {
    width: 18px;
    height: 18px;
  }

  .trash-count {
    position: absolute;
    top: -5px;
    right: -5px;
    min-width: 16px;
    height: 16px;
    padding: 0 0.25rem;
    border-radius: 999px;
    background: var(--danger);
    color: #fff;
    font-size: 0.625rem;
    font-weight: 700;
    line-height: 16px;
    text-align: center;
    pointer-events: none;
  }

  .new-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: #1c1917;
    color: #ffffff;
    cursor: pointer;
    transition: background 0.2s;
  }

  .new-btn:hover {
    background: #292524;
  }

  .new-icon {
    width: 20px;
    height: 20px;
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
    transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.15s ease;
  }

  .bulk-btn:hover {
    background: color-mix(in srgb, var(--accent) 10%, var(--surface));
    border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
    color: var(--accent);
  }

  .bulk-btn.danger {
    border-color: rgba(239, 68, 68, 0.25);
    background: rgba(239, 68, 68, 0.08);
    color: var(--danger);
  }

  .bulk-btn.danger:hover {
    background: rgba(239, 68, 68, 0.16);
    border-color: rgba(239, 68, 68, 0.45);
    color: var(--danger);
  }

  .bulk-btn.ghost {
    background: var(--surface);
    color: var(--text-muted);
    border-color: var(--border);
  }

  .bulk-btn.ghost:hover {
    background: var(--bg);
    color: var(--text);
    border-color: var(--text-muted);
  }

  .bulk-btn:active {
    transform: scale(0.98);
  }

  .note-list {
    flex: 1;
    overflow-y: auto;
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

  .searching-hint {
    margin: 0 1rem 0.75rem;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.8rem;
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
    display: flex;
    align-items: center;
    gap: 0.4rem;
    width: 100%;
    font-weight: 600;
    color: var(--text);
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .title.unsaved {
    color: color-mix(in srgb, var(--accent) 42%, var(--text));
  }

  .unsaved-dot {
    flex-shrink: 0;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: var(--accent);
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    width: 100%;
  }

  .tag {
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--text-muted) 14%, transparent);
    color: var(--text-muted);
    font-size: 0.7rem;
    font-weight: 600;
    line-height: 1.4;
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

</style>
<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { authState, getUserDisplayLabel } from '../auth.svelte'
  import { clearDraftAiChat, clearDraftAiChats } from '../draft-ai-chat'
  import { clearDraftContent, clearDraftContents } from '../draft-content'
  import { downloadNotesJson, readNotesFromFile } from '../note-io'
  import {
    createNote,
    emptyTrash,
    fetchNoteContent,
    fetchNoteContents,
    fetchTrashNoteContent,
    importNotes,
    moveNoteToTrash,
    moveNotesToTrash,
    permanentlyDeleteNote,
    permanentlyDeleteNotes,
    restoreNoteFromTrash,
    restoreNotesFromTrash,
    searchNotes,
    subscribeToNotes,
    subscribeToTrash,
    updateNote,
  } from '../notes'
  import type { Note, NoteAiActiveIds, NoteContentViewMode, NoteInput, TrashedNote } from '../types'
  import { accountModalState, closeAccountSettings, openAccountSettings } from '../account-modal.svelte'
  import { confirm } from '../dialog.svelte'
  import { t } from '../i18n.svelte'
  import { toastError, toastSuccess } from '../toast.svelte'
  import LocaleThemeControls from './LocaleThemeControls.svelte'
  import NoteEditor from './NoteEditor.svelte'
  import NoteSidebar from './NoteSidebar.svelte'
  import TrashSidebar from './TrashSidebar.svelte'

  type View = 'notes' | 'trash'

  let view = $state<View>('notes')
  let notes = $state<Note[]>([])
  let trashedNotes = $state<TrashedNote[]>([])
  let selectedId = $state<string | null>(null)
  let checkedIds = $state<Set<string>>(new Set())
  let saving = $state(false)
  let sidebarOpen = $state(false)
  let keyManagerOpen = $state(false)

  let importInput = $state<HTMLInputElement | undefined>(undefined)
  let searchInput = $state('')
  let debouncedSearch = $state('')
  let searchResults = $state<Note[] | null>(null)
  let searching = $state(false)
  let searchExpanded = $state(false)
  let searchInputEl = $state<HTMLInputElement | undefined>(undefined)

  const SIDEBAR_COLLAPSED_KEY = 'notedata-sidebar-collapsed'
  const DESKTOP_MIN_WIDTH = 769

  function loadSidebarCollapsed(): boolean {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  }

  let sidebarCollapsed = $state(loadSidebarCollapsed())
  let searchFocused = $state(false)
  let isDesktop = $state(
    typeof window !== 'undefined' &&
      window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`).matches,
  )

  let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined
  let searchRequestId = 0
  let noteContentCache = $state<Record<string, string>>({})
  let loadedContentIds = $state<Set<string>>(new Set())
  let contentLoading = $state(false)
  let contentLoadRequestId = 0

  const isSearchActive = $derived(view === 'notes' && debouncedSearch.trim().length > 0)

  const sidebarCollapsedActive = $derived(sidebarCollapsed && isDesktop)

  const sidebarSearchActive = $derived(
    view === 'notes' && (searchFocused || searchInput.trim().length > 0),
  )

  const sidebarSearchReveal = $derived(
    sidebarSearchActive && (sidebarCollapsedActive || !isDesktop),
  )

  const topbarUserLabel = $derived(
    getUserDisplayLabel(authState.user, authState.profileTick),
  )

  const displayedNotes = $derived(
    isSearchActive && searchResults !== null ? searchResults : notes,
  )

  function mergeNoteWithCachedContent<T extends Note>(note: T): T {
    if (!loadedContentIds.has(note.id)) return note
    return { ...note, content: noteContentCache[note.id] ?? '' }
  }

  function mergeNotesWithCachedContent(loaded: Note[]): Note[] {
    return loaded.map((note) => mergeNoteWithCachedContent(note))
  }

  function cacheNoteContent(noteId: string, content: string) {
    noteContentCache = { ...noteContentCache, [noteId]: content }
    loadedContentIds = new Set(loadedContentIds).add(noteId)
    notes = notes.map((note) => (note.id === noteId ? { ...note, content } : note))
    trashedNotes = trashedNotes.map((note) =>
      note.id === noteId ? { ...note, content } : note,
    )
    if (searchResults) {
      searchResults = searchResults.map((note) =>
        note.id === noteId ? { ...note, content } : note,
      )
    }
  }

  const selectedNote = $derived.by(() => {
    const note = notes.find((n) => n.id === selectedId) ?? null
    return note ? mergeNoteWithCachedContent(note) : null
  })

  const selectedTrashedNote = $derived.by(() => {
    const note = trashedNotes.find((n) => n.id === selectedId) ?? null
    return note ? mergeNoteWithCachedContent(note) : null
  })

  $effect(() => {
    const userId = authState.user?.uid
    const id = selectedId
    const currentView = view
    if (!userId || !id || loadedContentIds.has(id)) return

    const requestId = ++contentLoadRequestId
    contentLoading = true

    void (async () => {
      try {
        const content =
          currentView === 'trash'
            ? await fetchTrashNoteContent(userId, id)
            : await fetchNoteContent(userId, id)
        if (requestId !== contentLoadRequestId || selectedId !== id) return
        cacheNoteContent(id, content)
      } catch (err) {
        if (requestId === contentLoadRequestId) {
          notifyOperationFailed(err)
        }
      } finally {
        if (requestId === contentLoadRequestId) {
          contentLoading = false
        }
      }
    })()
  })

  function resetSearchState() {
    searchInput = ''
    debouncedSearch = ''
    searchResults = null
    searching = false
    searchRequestId += 1
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = undefined
    }
  }

  async function runSearch(query: string) {
    const userId = authState.user?.uid
    if (!userId || view !== 'notes') return

    debouncedSearch = query
    const requestId = ++searchRequestId
    searching = true

    try {
      const results = await searchNotes(userId, query)
      if (requestId !== searchRequestId) return
      searchResults = mergeNotesWithCachedContent(results)
    } catch {
      if (requestId !== searchRequestId) return
      searchResults = []
    } finally {
      if (requestId === searchRequestId) {
        searching = false
      }
    }
  }

  function handleSearchInput(value: string) {
    searchInput = value
    const query = value.trim()

    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = undefined
    }

    if (!query) {
      debouncedSearch = ''
      searchResults = null
      searching = false
      searchRequestId += 1
      return
    }

    searchDebounceTimer = setTimeout(() => {
      searchDebounceTimer = undefined
      void runSearch(query)
    }, 1000)
  }

  onMount(() => {
    const desktopMq = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`)
    const syncDesktop = () => {
      isDesktop = desktopMq.matches
    }
    syncDesktop()
    desktopMq.addEventListener('change', syncDesktop)

    const userId = authState.user?.uid
    if (!userId) {
      return () => desktopMq.removeEventListener('change', syncDesktop)
    }

    const unsubscribeNotes = subscribeToNotes(userId, (loaded) => {
      notes = mergeNotesWithCachedContent(loaded)
      pruneCheckedIds(loaded.map((n) => n.id))
      if (view === 'notes' && selectedId && !loaded.some((n) => n.id === selectedId)) {
        selectedId = loaded[0]?.id ?? null
      }
    })

    const unsubscribeTrash = subscribeToTrash(userId, (loaded) => {
      trashedNotes = mergeNotesWithCachedContent(loaded) as TrashedNote[]
      pruneCheckedIds(loaded.map((n) => n.id))
      if (view === 'trash' && selectedId && !loaded.some((n) => n.id === selectedId)) {
        selectedId = loaded[0]?.id ?? null
      }
    })

    return () => {
      desktopMq.removeEventListener('change', syncDesktop)
      unsubscribeNotes()
      unsubscribeTrash()
    }
  })

  function pruneCheckedIds(validIds: string[]) {
    const valid = new Set(validIds)
    const next = new Set([...checkedIds].filter((id) => valid.has(id)))
    if (next.size !== checkedIds.size) {
      checkedIds = next
    }
  }

  function clearSelection() {
    checkedIds = new Set()
  }

  function toggleCheck(id: string) {
    const next = new Set(checkedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    checkedIds = next
  }

  function checkIds(ids: string[]) {
    const next = new Set(checkedIds)
    ids.forEach((id) => next.add(id))
    checkedIds = next
  }

  function uncheckIds(ids: string[]) {
    const next = new Set(checkedIds)
    ids.forEach((id) => next.delete(id))
    checkedIds = next
  }

  function getCheckedNotes() {
    return notes.filter((note) => checkedIds.has(note.id))
  }

  function getCheckedTrashedNotes() {
    return trashedNotes.filter((note) => checkedIds.has(note.id))
  }

  function notifyOperationFailed(err?: unknown) {
    const message =
      err instanceof Error && err.message ? err.message : t('toastOperationFailed')
    toastError(message)
  }

  async function handleCreate() {
    const userId = authState.user?.uid
    if (!userId) return

    view = 'notes'
    clearSelection()
    const id = await createNote(userId, { title: '', content: '' })
    cacheNoteContent(id, '')
    selectedId = id
    sidebarOpen = false
  }

  async function handleSave(payload: NoteInput) {
    const userId = authState.user?.uid
    if (!userId || !selectedId || view !== 'notes') return

    saving = true
    try {
      await updateNote(userId, selectedId, payload)
      if (payload.content !== undefined) {
        cacheNoteContent(selectedId, payload.content)
      }
      toastSuccess(t('toastNoteSaved'))
    } catch (err) {
      notifyOperationFailed(err)
    } finally {
      saving = false
    }
  }

  async function handleSaveTags(tags: string[]) {
    const userId = authState.user?.uid
    if (!userId || !selectedId || view !== 'notes') return

    await updateNote(userId, selectedId, { tags })
  }

  async function handleSaveTitle(noteId: string, title: string) {
    const userId = authState.user?.uid
    if (!userId || view !== 'notes') return

    await updateNote(userId, noteId, { title })
  }

  async function handleSaveNoteAiActive(noteId: string, patch: Partial<NoteAiActiveIds>) {
    const userId = authState.user?.uid
    if (!userId || view !== 'notes') return

    await updateNote(userId, noteId, patch)
  }

  async function handleSaveContentViewMode(noteId: string, contentViewMode: NoteContentViewMode) {
    const userId = authState.user?.uid
    if (!userId || view !== 'notes') return

    await updateNote(userId, noteId, { contentViewMode })
  }

  function openKeyManager() {
    keyManagerOpen = true
  }

  async function handleMoveToTrash(id: string) {
    const userId = authState.user?.uid
    if (!userId) return

    const note = notes.find((n) => n.id === id)
    if (!note) return

    if (!(await confirm({
      message: t('confirmMoveToTrash'),
      variant: 'warning',
      confirmLabel: t('moveToTrash'),
    }))) return

    try {
      await moveNoteToTrash(userId, note)
      clearDraftContent(id)
      clearDraftAiChat(id)
      checkedIds.delete(id)
      checkedIds = new Set(checkedIds)
      if (selectedId === id) {
        selectedId = notes.find((n) => n.id !== id)?.id ?? null
      }
      toastSuccess(t('toastMovedToTrash'))
    } catch (err) {
      notifyOperationFailed(err)
    }
  }

  async function handleBulkDelete() {
    const userId = authState.user?.uid
    const selectedNotes = getCheckedNotes()
    if (!userId || selectedNotes.length === 0) return

    if (!(await confirm({
      message: t('confirmBulkMoveToTrash', { count: selectedNotes.length }),
      variant: 'warning',
      confirmLabel: t('moveToTrash'),
    }))) return

    try {
      await moveNotesToTrash(userId, selectedNotes)
      const trashedIds = selectedNotes.map((note) => note.id)
      clearDraftContents(trashedIds)
      clearDraftAiChats(trashedIds)
      clearSelection()
      if (selectedId && !notes.some((n) => n.id === selectedId)) {
        selectedId = notes[0]?.id ?? null
      }
      toastSuccess(t('toastBulkMovedToTrash', { count: selectedNotes.length }))
    } catch (err) {
      notifyOperationFailed(err)
    }
  }

  async function handleBulkExport() {
    const userId = authState.user?.uid
    const selectedNotes = getCheckedNotes()
    if (!userId || selectedNotes.length === 0) return

    try {
      const missingIds = selectedNotes
        .filter((note) => !loadedContentIds.has(note.id))
        .map((note) => note.id)

      if (missingIds.length > 0) {
        const contents = await fetchNoteContents(userId, missingIds)
        for (const [id, content] of Object.entries(contents)) {
          cacheNoteContent(id, content)
        }
      }

      const notesToExport = selectedNotes.map((note) => ({
        ...note,
        content: noteContentCache[note.id] ?? note.content ?? '',
      }))

      downloadNotesJson(notesToExport)
      toastSuccess(t('toastExported', { count: selectedNotes.length }))
    } catch (err) {
      notifyOperationFailed(err)
    }
  }

  function triggerImport() {
    importInput?.click()
  }

  async function handleImportFile(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''

    if (!file) return

    const userId = authState.user?.uid
    if (!userId) return

    try {
      const imported = await readNotesFromFile(file)
      const ids = await importNotes(userId, imported)

      view = 'notes'
      clearSelection()
      selectedId = ids[0] ?? selectedId
      toastSuccess(t('importSuccess', { count: ids.length }))
    } catch (err) {
      toastError(err instanceof Error ? err.message : t('importFailed'))
    }
  }

  async function handleRestore(id: string) {
    const userId = authState.user?.uid
    if (!userId) return

    const note = trashedNotes.find((n) => n.id === id)
    if (!note) return

    try {
      await restoreNoteFromTrash(userId, note)
      checkedIds.delete(id)
      checkedIds = new Set(checkedIds)
      if (selectedId === id) {
        selectedId = trashedNotes.find((n) => n.id !== id)?.id ?? null
      }
      toastSuccess(t('toastRestored'))
    } catch (err) {
      notifyOperationFailed(err)
    }
  }

  async function handleBulkRestore() {
    const userId = authState.user?.uid
    const selectedTrash = getCheckedTrashedNotes()
    if (!userId || selectedTrash.length === 0) return

    const restoredIds = new Set(selectedTrash.map((note) => note.id))

    try {
      await restoreNotesFromTrash(userId, selectedTrash)
      clearSelection()
      if (selectedId && restoredIds.has(selectedId)) {
        selectedId = trashedNotes.find((note) => !restoredIds.has(note.id))?.id ?? null
      }
      toastSuccess(t('toastBulkRestored', { count: selectedTrash.length }))
    } catch (err) {
      notifyOperationFailed(err)
    }
  }

  async function handlePermanentDelete(id: string) {
    const userId = authState.user?.uid
    if (!userId) return

    if (!(await confirm({
      message: t('confirmPermanentDelete'),
      variant: 'danger',
      confirmLabel: t('permanentDelete'),
    }))) return

    try {
      await permanentlyDeleteNote(userId, id)
      checkedIds.delete(id)
      checkedIds = new Set(checkedIds)
      if (selectedId === id) {
        selectedId = trashedNotes.find((n) => n.id !== id)?.id ?? null
      }
      toastSuccess(t('toastPermanentDeleted'))
    } catch (err) {
      notifyOperationFailed(err)
    }
  }

  async function handleBulkPermanentDelete() {
    const userId = authState.user?.uid
    const ids = [...checkedIds]
    if (!userId || ids.length === 0) return

    if (!(await confirm({
      message: t('confirmBulkPermanentDelete', { count: ids.length }),
      variant: 'danger',
      confirmLabel: t('permanentDelete'),
    }))) return

    try {
      await permanentlyDeleteNotes(userId, ids)
      clearSelection()
      if (selectedId && !trashedNotes.some((n) => n.id === selectedId)) {
        selectedId = trashedNotes[0]?.id ?? null
      }
      toastSuccess(t('toastBulkPermanentDeleted', { count: ids.length }))
    } catch (err) {
      notifyOperationFailed(err)
    }
  }

  async function handleEmptyTrash() {
    const userId = authState.user?.uid
    if (!userId || trashedNotes.length === 0) return

    if (!(await confirm({
      message: t('confirmEmptyTrash', { count: trashedNotes.length }),
      variant: 'danger',
      confirmLabel: t('emptyTrash'),
    }))) return

    try {
      await emptyTrash(userId)
      clearSelection()
      selectedId = null
      toastSuccess(t('toastTrashEmptied'))
    } catch (err) {
      notifyOperationFailed(err)
    }
  }

  function handleSelect(id: string) {
    selectedId = id
    sidebarOpen = false
  }

  function clearSearch() {
    resetSearchState()
    searchExpanded = false
  }

  async function openMobileSearch() {
    searchExpanded = true
    await tick()
    searchInputEl?.focus()
  }

  function openTrash() {
    view = 'trash'
    clearSelection()
    clearSearch()
    selectedId = trashedNotes[0]?.id ?? null
    sidebarOpen = false
  }

  function backToNotes() {
    view = 'notes'
    clearSelection()
    selectedId = notes[0]?.id ?? null
    sidebarOpen = false
  }

  function toggleSidebarCollapsed() {
    sidebarCollapsed = !sidebarCollapsed
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0')
  }
</script>

<input
  bind:this={importInput}
  type="file"
  accept="application/json,.json"
  class="hidden-input"
  onchange={handleImportFile}
/>

<div class="app">
  <header class="topbar" class:search-expanded={searchExpanded}>
    <button
      type="button"
      class="menu-btn"
      onclick={() => (sidebarOpen = !sidebarOpen)}
      aria-label={t('openMenu')}
    >
      ☰
    </button>
    <button
      type="button"
      class="app-logo-btn topbar-main"
      class:active={sidebarCollapsedActive}
      onclick={toggleSidebarCollapsed}
      aria-label={sidebarCollapsed ? t('expandSidebar') : t('collapseSidebar')}
      title={sidebarCollapsed ? t('expandSidebar') : t('collapseSidebar')}
    >
      <span class="app-logo-mark" aria-hidden="true">N</span>
      <span class="sr-only">{t('appName')}</span>
    </button>

    {#if view === 'notes'}
      <div class="search-wrap">
        <input
          bind:this={searchInputEl}
          type="text"
          class="search-input"
          value={searchInput}
          placeholder={t('searchNotesPlaceholder')}
          aria-label={t('searchNotes')}
          oninput={(event) => handleSearchInput(event.currentTarget.value)}
          onfocus={() => (searchFocused = true)}
          onblur={() => (searchFocused = false)}
        />
        {#if searching}
          <span class="search-status" aria-live="polite">{t('searching')}</span>
        {/if}
        {#if searchInput || searchExpanded}
          <button
            type="button"
            class="search-clear"
            onclick={clearSearch}
            aria-label={t('clearSearch')}
          >
            ×
          </button>
        {/if}
      </div>
    {/if}

    <div class="user-area topbar-main">
      {#if view === 'notes'}
        <button
          type="button"
          class="search-toggle-btn"
          onclick={openMobileSearch}
          aria-label={t('searchNotes')}
          title={t('searchNotes')}
        >
          <svg class="search-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" />
            <path
              d="M20 20l-3.5-3.5"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      {/if}
      <span class="email" title={authState.user?.email ?? ''}>{topbarUserLabel}</span>
      <LocaleThemeControls />
      <button
        type="button"
        class="keys-btn"
        onclick={openKeyManager}
        aria-label={t('encryptionKeys')}
        title={t('encryptionKeys')}
      >
        <svg class="keys-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M7 11V7a5 5 0 0 1 10 0v4M6 11h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z"
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
        class="account-btn"
        onclick={() => openAccountSettings()}
        aria-label={t('userAccount')}
        title={t('userAccount')}
      >
        <svg class="account-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </div>
  </header>

  <div class="layout">
    <div class="sidebar-slot" class:collapsed={sidebarCollapsedActive}>
    <div
      class="sidebar-wrap"
      class:open={sidebarOpen}
      class:collapsed={sidebarCollapsedActive}
      class:search-reveal={sidebarSearchReveal}
    >
      {#if view === 'notes'}
        <NoteSidebar
          notes={displayedNotes}
          trashCount={trashedNotes.length}
          selectedId={selectedId}
          {checkedIds}
          isSearchActive={isSearchActive}
          {searching}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onOpenTrash={openTrash}
          onToggleCheck={toggleCheck}
          onCheckIds={checkIds}
          onUncheckIds={uncheckIds}
          onClearSelection={clearSelection}
          onBulkDelete={handleBulkDelete}
          onBulkExport={handleBulkExport}
          onImport={triggerImport}
        />
      {:else}
        <TrashSidebar
          notes={trashedNotes}
          selectedId={selectedId}
          {checkedIds}
          onSelect={handleSelect}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
          onEmptyTrash={handleEmptyTrash}
          onBack={backToNotes}
          onToggleCheck={toggleCheck}
          onCheckIds={checkIds}
          onUncheckIds={uncheckIds}
          onClearSelection={clearSelection}
          onBulkRestore={handleBulkRestore}
          onBulkPermanentDelete={handleBulkPermanentDelete}
        />
      {/if}
    </div>
    </div>

    {#if sidebarOpen}
      <button
        type="button"
        class="overlay"
        onclick={() => (sidebarOpen = false)}
        aria-label={t('closeMenu')}
      ></button>
    {/if}

    <main class="main">
      {#if view === 'notes'}
        <NoteEditor
          note={selectedNote}
          contentLoading={contentLoading}
          onSave={handleSave}
          onSaveTitle={handleSaveTitle}
          onSaveTags={handleSaveTags}
          onSaveNoteAiActive={handleSaveNoteAiActive}
          onSaveContentViewMode={handleSaveContentViewMode}
          {saving}
          onDelete={() => selectedId && handleMoveToTrash(selectedId)}
          onManageKeys={openKeyManager}
        />
      {:else}
        <NoteEditor
          note={selectedTrashedNote}
          contentLoading={contentLoading}
          onSave={handleSave}
          saving={false}
          readonly
          deletedAt={selectedTrashedNote?.deletedAt}
          onRestore={() => selectedTrashedNote && handleRestore(selectedTrashedNote.id)}
          onPermanentDelete={() => selectedTrashedNote && handlePermanentDelete(selectedTrashedNote.id)}
          onManageKeys={openKeyManager}
          emptyTitle={t('selectTrashNote')}
          emptyDescription={t('selectTrashNoteHint')}
        />
      {/if}
    </main>
  </div>
</div>

{#if keyManagerOpen}
  {#await import('./KeyManagerModal.svelte') then { default: KeyManagerModal }}
    <KeyManagerModal open={keyManagerOpen} onClose={() => (keyManagerOpen = false)} />
  {/await}
{/if}

{#if accountModalState.open}
  {#await import('./UserAccountModal.svelte') then { default: UserAccountModal }}
    <UserAccountModal
      open={accountModalState.open}
      focusSection={accountModalState.focusSection}
      onClose={closeAccountSettings}
    />
  {/await}
{/if}

<style>
  .hidden-input {
    display: none;
  }

  .app {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .topbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    z-index: 10;
  }

  .menu-btn {
    display: none;
    width: 40px;
    height: 40px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    font-size: 1.1rem;
    cursor: pointer;
  }

  .app-logo-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
  }

  .app-logo-btn:hover {
    background: var(--surface);
    border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
  }

  .app-logo-btn.active {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--input-focus-ring);
  }

  .app-logo-mark {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--accent), #f97316);
    color: #fff;
    font-size: 0.95rem;
    font-weight: 700;
    display: grid;
    place-items: center;
    line-height: 1;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .search-wrap {
    flex: 1;
    min-width: 0;
    max-width: 420px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: relative;
  }

  .search-input {
    width: 100%;
    padding: 0.55rem 2.25rem 0.55rem 0.9rem;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    color: var(--text);
    font-size: 0.9rem;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .search-input::placeholder {
    color: var(--text-muted);
    opacity: 0.7;
  }

  .search-status {
    position: absolute;
    right: 2.5rem;
    font-size: 0.75rem;
    color: var(--text-muted);
    pointer-events: none;
  }

  .search-clear {
    position: absolute;
    right: 0.35rem;
    z-index: 2;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text-muted);
    font-size: 1.2rem;
    line-height: 1;
    cursor: pointer;
    flex-shrink: 0;
  }

  .search-clear:hover {
    background: var(--surface);
    color: var(--text);
  }

  .search-toggle-btn {
    display: none;
  }

  .user-area {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .email {
    font-size: 0.85rem;
    color: var(--text-muted);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .keys-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    cursor: pointer;
    transition: background 0.2s;
  }

  .keys-btn:hover {
    background: var(--surface);
  }

  .keys-icon {
    width: 18px;
    height: 18px;
  }

  .account-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s, color 0.2s;
  }

  .account-btn:hover {
    background: var(--surface);
    border-color: var(--accent);
    color: var(--accent);
  }

  .account-icon {
    width: 18px;
    height: 18px;
  }

  .layout {
    flex: 1;
    display: flex;
    overflow: hidden;
    position: relative;
  }

  .sidebar-slot {
    position: relative;
    width: 320px;
    flex-shrink: 0;
    height: 100%;
  }

  .sidebar-wrap {
    width: 100%;
    height: 100%;
    z-index: 5;
    transition: width 0.22s ease, box-shadow 0.22s ease;
  }

  @media (min-width: 769px) {
    .sidebar-slot.collapsed {
      width: 52px;
    }

    .sidebar-wrap.collapsed {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 52px;
      overflow: hidden;
    }

    .sidebar-wrap.collapsed:hover,
    .sidebar-wrap.collapsed.search-reveal {
      width: 320px;
      overflow: hidden;
      z-index: 6;
      box-shadow: var(--shadow-lg);
    }

    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.sidebar-header h2),
    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.header-text),
    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.sort-wrap),
    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.icon-btn:not(.new-btn)),
    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.bulk-bar),
    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.select-all),
    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.checkbox-wrap),
    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.preview),
    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.tags),
    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.date),
    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.load-more-info),
    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.searching-hint),
    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.empty),
    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.load-more-wrap),
    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.actions),
    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.item-actions) {
      display: none;
    }

    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.sidebar-header) {
      justify-content: center;
      padding: 0.4rem 0;
      border-bottom: none;
    }

    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.header-actions) {
      flex-direction: column;
      gap: 0.25rem;
    }

    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.new-btn) {
      width: 32px;
      height: 32px;
    }

    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.back-btn) {
      width: 32px;
      height: 32px;
      margin: 0 auto;
    }

    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.note-item) {
      margin: 0 0.35rem 0.3rem;
      border-radius: 8px;
    }

    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.note-btn) {
      width: 100%;
      padding: 0.45rem 0;
      align-items: center;
      justify-content: center;
    }

    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.title) {
      display: block;
      width: 1.25rem;
      max-width: 1.25rem;
      text-align: center;
      font-size: 0;
      line-height: 1.25rem;
      white-space: nowrap;
      overflow: hidden;
    }

    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.unsaved-dot) {
      display: none;
    }

    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.title:not(:empty))::first-letter {
      font-size: 0.82rem;
      font-weight: 700;
    }

    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.title:empty)::before {
      content: '·';
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.note-item.selected) {
      background: rgba(245, 158, 11, 0.16);
    }

    .sidebar-wrap.collapsed:not(:hover):not(.search-reveal) :global(.note-item.selected .note-btn) {
      box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--accent) 55%, transparent);
    }
  }

  .main {
    flex: 1;
    min-width: 0;
    height: 100%;
  }

  .overlay {
    display: none;
    position: absolute;
    inset: 0;
    border: none;
    background: var(--overlay);
    cursor: pointer;
    z-index: 4;
  }

  @media (max-width: 768px) {
    .topbar {
      gap: 0.5rem;
      padding: 0.5rem;
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      flex-wrap: nowrap;
      scrollbar-width: none;
      -ms-overflow-style: none;
      -webkit-overflow-scrolling: touch;
    }

    .topbar::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }

    .menu-btn {
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .app-logo-btn {
      display: none;
    }

    .search-toggle-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      padding: 0;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--bg);
      color: var(--text);
      cursor: pointer;
      transition: background 0.2s;
      flex-shrink: 0;
    }

    .search-toggle-btn:hover {
      background: var(--surface);
    }

    .search-toggle-icon {
      width: 18px;
      height: 18px;
    }

    .topbar:not(.search-expanded) .search-wrap {
      display: none;
    }

    .topbar.search-expanded {
      gap: 0.5rem;
    }

    .topbar.search-expanded .topbar-main,
    .topbar.search-expanded .search-toggle-btn {
      display: none;
    }

    .topbar.search-expanded .menu-btn {
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .topbar.search-expanded .search-wrap {
      display: flex;
      flex: 1 0 12rem;
      min-width: 12rem;
      max-width: none;
    }

    .search-status {
      display: none;
    }

    .user-area {
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .keys-btn,
    .account-btn {
      flex-shrink: 0;
    }

    .email {
      display: none;
    }

    .sidebar-slot {
      position: static;
      width: 0;
      flex-shrink: 0;
      overflow: visible;
    }

    .sidebar-wrap {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 320px;
      transform: translateX(-100%);
      transition: transform 0.25s ease;
      box-shadow: var(--shadow-lg);
    }

    .sidebar-wrap.open,
    .sidebar-wrap.search-reveal {
      transform: translateX(0);
    }

    .overlay {
      display: block;
    }
  }
</style>
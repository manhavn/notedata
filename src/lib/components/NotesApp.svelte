<script lang="ts">
  import { onMount } from 'svelte'
  import { authState, logout } from '../auth.svelte'
  import { downloadNotesJson, readNotesFromFile } from '../note-io'
  import {
    createNote,
    emptyTrash,
    importNotes,
    moveNoteToTrash,
    moveNotesToTrash,
    permanentlyDeleteNote,
    permanentlyDeleteNotes,
    restoreNoteFromTrash,
    restoreNotesFromTrash,
    subscribeToNotes,
    subscribeToTrash,
    updateNote,
  } from '../notes'
  import type { Note, TrashedNote } from '../types'
  import { t } from '../i18n.svelte'
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
  let importInput: HTMLInputElement

  const selectedNote = $derived(
    notes.find((n) => n.id === selectedId) ?? null,
  )

  const selectedTrashedNote = $derived(
    trashedNotes.find((n) => n.id === selectedId) ?? null,
  )

  onMount(() => {
    const userId = authState.user?.uid
    if (!userId) return

    const unsubscribeNotes = subscribeToNotes(userId, (loaded) => {
      notes = loaded
      pruneCheckedIds(loaded.map((n) => n.id))
      if (view === 'notes' && selectedId && !loaded.some((n) => n.id === selectedId)) {
        selectedId = loaded[0]?.id ?? null
      }
    })

    const unsubscribeTrash = subscribeToTrash(userId, (loaded) => {
      trashedNotes = loaded
      pruneCheckedIds(loaded.map((n) => n.id))
      if (view === 'trash' && selectedId && !loaded.some((n) => n.id === selectedId)) {
        selectedId = loaded[0]?.id ?? null
      }
    })

    return () => {
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

  async function handleCreate() {
    const userId = authState.user?.uid
    if (!userId) return

    view = 'notes'
    clearSelection()
    const id = await createNote(userId, { title: '', content: '' })
    selectedId = id
    sidebarOpen = false
  }

  async function handleSave(title: string, content: string) {
    const userId = authState.user?.uid
    if (!userId || !selectedId || view !== 'notes') return

    saving = true
    try {
      await updateNote(userId, selectedId, { title, content })
    } finally {
      saving = false
    }
  }

  async function handleMoveToTrash(id: string) {
    const userId = authState.user?.uid
    if (!userId) return

    const note = notes.find((n) => n.id === id)
    if (!note) return

    if (!confirm(t('confirmMoveToTrash'))) return

    await moveNoteToTrash(userId, note)
    checkedIds.delete(id)
    checkedIds = new Set(checkedIds)
    if (selectedId === id) {
      selectedId = notes.find((n) => n.id !== id)?.id ?? null
    }
  }

  async function handleBulkDelete() {
    const userId = authState.user?.uid
    const selectedNotes = getCheckedNotes()
    if (!userId || selectedNotes.length === 0) return

    if (!confirm(t('confirmBulkMoveToTrash', { count: selectedNotes.length }))) return

    await moveNotesToTrash(userId, selectedNotes)
    clearSelection()
    if (selectedId && !notes.some((n) => n.id === selectedId)) {
      selectedId = notes[0]?.id ?? null
    }
  }

  function handleBulkExport() {
    const selectedNotes = getCheckedNotes()
    if (selectedNotes.length === 0) return

    downloadNotesJson(selectedNotes)
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
      alert(t('importSuccess', { count: ids.length }))
    } catch (err) {
      alert(err instanceof Error ? err.message : t('importFailed'))
    }
  }

  async function handleRestore(id: string) {
    const userId = authState.user?.uid
    if (!userId) return

    const note = trashedNotes.find((n) => n.id === id)
    if (!note) return

    await restoreNoteFromTrash(userId, note)
    checkedIds.delete(id)
    checkedIds = new Set(checkedIds)
    if (selectedId === id) {
      selectedId = trashedNotes.find((n) => n.id !== id)?.id ?? null
    }
  }

  async function handleBulkRestore() {
    const userId = authState.user?.uid
    const selectedTrash = getCheckedTrashedNotes()
    if (!userId || selectedTrash.length === 0) return

    const restoredIds = new Set(selectedTrash.map((note) => note.id))
    await restoreNotesFromTrash(userId, selectedTrash)
    clearSelection()
    if (selectedId && restoredIds.has(selectedId)) {
      selectedId = trashedNotes.find((note) => !restoredIds.has(note.id))?.id ?? null
    }
  }

  async function handlePermanentDelete(id: string) {
    const userId = authState.user?.uid
    if (!userId) return

    if (!confirm(t('confirmPermanentDelete'))) return

    await permanentlyDeleteNote(userId, id)
    checkedIds.delete(id)
    checkedIds = new Set(checkedIds)
    if (selectedId === id) {
      selectedId = trashedNotes.find((n) => n.id !== id)?.id ?? null
    }
  }

  async function handleBulkPermanentDelete() {
    const userId = authState.user?.uid
    const ids = [...checkedIds]
    if (!userId || ids.length === 0) return

    if (!confirm(t('confirmBulkPermanentDelete', { count: ids.length }))) return

    await permanentlyDeleteNotes(userId, ids)
    clearSelection()
    if (selectedId && !trashedNotes.some((n) => n.id === selectedId)) {
      selectedId = trashedNotes[0]?.id ?? null
    }
  }

  async function handleEmptyTrash() {
    const userId = authState.user?.uid
    if (!userId || trashedNotes.length === 0) return

    if (!confirm(t('confirmEmptyTrash', { count: trashedNotes.length }))) return

    await emptyTrash(userId)
    clearSelection()
    selectedId = null
  }

  function handleSelect(id: string) {
    selectedId = id
    sidebarOpen = false
  }

  function openTrash() {
    view = 'trash'
    clearSelection()
    selectedId = trashedNotes[0]?.id ?? null
    sidebarOpen = false
  }

  function backToNotes() {
    view = 'notes'
    clearSelection()
    selectedId = notes[0]?.id ?? null
    sidebarOpen = false
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
  <header class="topbar">
    <button
      type="button"
      class="menu-btn"
      onclick={() => (sidebarOpen = !sidebarOpen)}
      aria-label={t('openMenu')}
    >
      ☰
    </button>
    <span class="app-name">{t('appName')}</span>
    <div class="user-area">
      <span class="email">{authState.user?.email}</span>
      <LocaleThemeControls />
      <button type="button" class="logout-btn" onclick={logout} aria-label={t('logout')}>
        <svg class="logout-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="logout-text">{t('logout')}</span>
      </button>
    </div>
  </header>

  <div class="layout">
    <div class="sidebar-wrap" class:open={sidebarOpen}>
      {#if view === 'notes'}
        <NoteSidebar
          {notes}
          trashCount={trashedNotes.length}
          selectedId={selectedId}
          {checkedIds}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onDelete={handleMoveToTrash}
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
        <NoteEditor note={selectedNote} onSave={handleSave} {saving} />
      {:else}
        <NoteEditor
          note={selectedTrashedNote}
          onSave={handleSave}
          saving={false}
          readonly
          deletedAt={selectedTrashedNote?.deletedAt}
          onRestore={() => selectedTrashedNote && handleRestore(selectedTrashedNote.id)}
          onPermanentDelete={() => selectedTrashedNote && handlePermanentDelete(selectedTrashedNote.id)}
          emptyTitle={t('selectTrashNote')}
          emptyDescription={t('selectTrashNoteHint')}
        />
      {/if}
    </main>
  </div>
</div>

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
    padding: 0.75rem 1.25rem;
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

  .app-name {
    font-weight: 700;
    font-size: 1.1rem;
    color: var(--text);
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

  .logout-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.45rem 0.9rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .logout-btn:hover {
    background: var(--surface);
  }

  .logout-icon {
    display: none;
    width: 18px;
    height: 18px;
  }

  .logout-text {
    line-height: 1;
  }

  .layout {
    flex: 1;
    display: flex;
    overflow: hidden;
    position: relative;
  }

  .sidebar-wrap {
    width: 320px;
    flex-shrink: 0;
    height: 100%;
    z-index: 5;
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
      padding: 0.75rem 1rem;
    }

    .menu-btn {
      display: grid;
      place-items: center;
    }

    .app-name {
      display: none;
    }

    .user-area {
      gap: 0.5rem;
    }

    .email {
      display: none;
    }

    .logout-btn {
      width: 40px;
      height: 40px;
      padding: 0;
    }

    .logout-icon {
      display: block;
    }

    .logout-text {
      display: none;
    }

    .sidebar-wrap {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      transform: translateX(-100%);
      transition: transform 0.25s ease;
      box-shadow: var(--shadow-lg);
    }

    .sidebar-wrap.open {
      transform: translateX(0);
    }

    .overlay {
      display: block;
    }
  }
</style>
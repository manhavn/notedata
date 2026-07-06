<script lang="ts">
  import { onMount } from 'svelte'
  import { authState, logout } from '../auth.svelte'
  import {
    createNote,
    deleteNote,
    subscribeToNotes,
    updateNote,
  } from '../notes'
  import type { Note } from '../types'
  import NoteEditor from './NoteEditor.svelte'
  import NoteSidebar from './NoteSidebar.svelte'

  let notes = $state<Note[]>([])
  let selectedId = $state<string | null>(null)
  let saving = $state(false)
  let sidebarOpen = $state(false)

  const selectedNote = $derived(
    notes.find((n) => n.id === selectedId) ?? null,
  )

  onMount(() => {
    const userId = authState.user?.uid
    if (!userId) return

    const unsubscribe = subscribeToNotes(userId, (loaded) => {
      notes = loaded
      if (selectedId && !loaded.some((n) => n.id === selectedId)) {
        selectedId = loaded[0]?.id ?? null
      }
    })

    return unsubscribe
  })

  async function handleCreate() {
    const userId = authState.user?.uid
    if (!userId) return

    const id = await createNote(userId, { title: '', content: '' })
    selectedId = id
    sidebarOpen = false
  }

  async function handleSave(title: string, content: string) {
    const userId = authState.user?.uid
    if (!userId || !selectedId) return

    saving = true
    try {
      await updateNote(userId, selectedId, { title, content })
    } finally {
      saving = false
    }
  }

  async function handleDelete(id: string) {
    const userId = authState.user?.uid
    if (!userId) return

    if (!confirm('Bạn có chắc muốn xóa ghi chú này?')) return

    await deleteNote(userId, id)
    if (selectedId === id) {
      selectedId = notes.find((n) => n.id !== id)?.id ?? null
    }
  }

  function handleSelect(id: string) {
    selectedId = id
    sidebarOpen = false
  }
</script>

<div class="app">
  <header class="topbar">
    <button
      type="button"
      class="menu-btn"
      onclick={() => (sidebarOpen = !sidebarOpen)}
      aria-label="Mở menu"
    >
      ☰
    </button>
    <span class="app-name">NoteData</span>
    <div class="user-area">
      <span class="email">{authState.user?.email}</span>
      <button type="button" class="logout-btn" onclick={logout}>Đăng xuất</button>
    </div>
  </header>

  <div class="layout">
    <div class="sidebar-wrap" class:open={sidebarOpen}>
      <NoteSidebar
        {notes}
        selectedId={selectedId}
        onSelect={handleSelect}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />
    </div>

    {#if sidebarOpen}
      <button
        type="button"
        class="overlay"
        onclick={() => (sidebarOpen = false)}
        aria-label="Đóng menu"
      ></button>
    {/if}

    <main class="main">
      <NoteEditor note={selectedNote} onSave={handleSave} {saving} />
    </main>
  </div>
</div>

<style>
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
    background: rgba(0, 0, 0, 0.3);
    cursor: pointer;
    z-index: 4;
  }

  @media (max-width: 768px) {
    .menu-btn {
      display: grid;
      place-items: center;
    }

    .email {
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
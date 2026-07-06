<script lang="ts">
  import type { Note } from '../types'

  interface Props {
    notes: Note[]
    selectedId: string | null
    onSelect: (id: string) => void
    onCreate: () => void
    onDelete: (id: string) => void
  }

  let { notes, selectedId, onSelect, onCreate, onDelete }: Props = $props()

  function formatDate(timestamp: number) {
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp))
  }

  function preview(content: string) {
    const text = content.trim()
    return text.length > 80 ? `${text.slice(0, 80)}...` : text || 'Chưa có nội dung'
  }
</script>

<aside class="sidebar">
  <div class="sidebar-header">
    <h2>Ghi chú</h2>
    <button type="button" class="new-btn" onclick={onCreate} title="Tạo ghi chú mới">
      +
    </button>
  </div>

  <div class="note-list">
    {#if notes.length === 0}
      <p class="empty">Chưa có ghi chú nào. Nhấn + để tạo mới.</p>
    {:else}
      {#each notes as note (note.id)}
        <div class="note-item" class:selected={note.id === selectedId}>
          <button type="button" class="note-btn" onclick={() => onSelect(note.id)}>
            <span class="title">{note.title}</span>
            <span class="preview">{preview(note.content)}</span>
            <span class="date">{formatDate(note.updatedAt)}</span>
          </button>
          <button
            type="button"
            class="delete-btn"
            onclick={() => onDelete(note.id)}
            title="Xóa ghi chú"
            aria-label="Xóa ghi chú"
          >
            ×
          </button>
        </div>
      {/each}
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
    padding: 1.25rem 1rem 1rem;
    border-bottom: 1px solid var(--border);
  }

  .sidebar-header h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
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

  .note-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem;
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
    gap: 0.25rem;
    margin-bottom: 0.5rem;
    border-radius: 12px;
    transition: background 0.2s;
  }

  .note-item.selected {
    background: rgba(245, 158, 11, 0.08);
  }

  .note-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    padding: 0.85rem 1rem;
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
    color: #dc2626;
  }
</style>
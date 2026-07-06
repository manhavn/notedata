<script lang="ts">
  import type { TrashedNote } from '../types'

  interface Props {
    notes: TrashedNote[]
    selectedId: string | null
    onSelect: (id: string) => void
    onRestore: (id: string) => void
    onPermanentDelete: (id: string) => void
    onEmptyTrash: () => void
    onBack: () => void
  }

  let {
    notes,
    selectedId,
    onSelect,
    onRestore,
    onPermanentDelete,
    onEmptyTrash,
    onBack,
  }: Props = $props()

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
    <button type="button" class="back-btn" onclick={onBack} title="Quay lại ghi chú">
      ←
    </button>
    <div class="header-text">
      <h2>Thùng rác</h2>
      <span class="count">{notes.length} ghi chú</span>
    </div>
  </div>

  {#if notes.length > 0}
    <div class="actions">
      <button type="button" class="empty-btn" onclick={onEmptyTrash}>
        Dọn sạch thùng rác
      </button>
    </div>
  {/if}

  <div class="note-list">
    {#if notes.length === 0}
      <p class="empty">Thùng rác trống. Các ghi chú đã xóa sẽ xuất hiện ở đây.</p>
    {:else}
      {#each notes as note (note.id)}
        <div class="note-item" class:selected={note.id === selectedId}>
          <button type="button" class="note-btn" onclick={() => onSelect(note.id)}>
            <span class="title">{note.title}</span>
            <span class="preview">{preview(note.content)}</span>
            <span class="date">Đã xóa: {formatDate(note.deletedAt)}</span>
          </button>
          <div class="item-actions">
            <button
              type="button"
              class="restore-btn"
              onclick={() => onRestore(note.id)}
              title="Khôi phục"
              aria-label="Khôi phục ghi chú"
            >
              ↩
            </button>
            <button
              type="button"
              class="delete-btn"
              onclick={() => onPermanentDelete(note.id)}
              title="Xóa vĩnh viễn"
              aria-label="Xóa vĩnh viễn"
            >
              ×
            </button>
          </div>
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

  .actions {
    padding: 0.75rem 1rem 0;
  }

  .empty-btn {
    width: 100%;
    padding: 0.6rem 0.85rem;
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 10px;
    background: rgba(239, 68, 68, 0.06);
    color: #dc2626;
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
    background: rgba(239, 68, 68, 0.06);
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

  .item-actions {
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
    color: #16a34a;
  }

  .delete-btn {
    color: var(--text-muted);
    font-size: 1.25rem;
  }

  .delete-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #dc2626;
  }
</style>
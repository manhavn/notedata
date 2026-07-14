<script lang="ts">
  import type { Snippet } from 'svelte'
  import { untrack } from 'svelte'
  import { t } from '../i18n.svelte'
  import { registerEscapeHandler } from '../modal-escape'
  import { PAGE_SIZE } from '../pagination'
  import { portal } from '../portal'

  export interface PickerItem {
    id: string
    label: string
    meta?: string
    badge?: string
    manageActions?: boolean
  }

  interface Props {
    open: boolean
    title: string
    subtitle?: string
    items: PickerItem[]
    selectedId?: string | null
    emptyLabel?: string
    large?: boolean
    manageMode?: boolean
    addLabel?: string
    showHeaderAdd?: boolean
    onClose: () => void
    onSelect: (id: string) => void
    onAdd?: () => void
    onEdit?: (id: string) => void
    onDelete?: (id: string) => void
    form?: Snippet
    footer?: Snippet
  }

  let {
    open,
    title,
    subtitle = '',
    items,
    selectedId = null,
    emptyLabel = '',
    large = false,
    manageMode = false,
    addLabel = '',
    showHeaderAdd = true,
    onClose,
    onSelect,
    onAdd,
    onEdit,
    onDelete,
    form,
    footer,
  }: Props = $props()

  let displayLimit = $state(PAGE_SIZE)
  let overlayReady = $state(false)

  const visibleItems = $derived(items.slice(0, displayLimit))
  const hasMore = $derived(items.length > displayLimit)

  function itemTitle(item: PickerItem): string {
    return item.meta ? `${item.label} · ${item.meta}` : item.label
  }

  function pickerItemKey(item: PickerItem): string {
    return item.id || '__picker-none__'
  }

  function resetPagination() {
    const selectedIndex =
      selectedId != null && selectedId !== ''
        ? items.findIndex((item) => item.id === selectedId)
        : -1
    displayLimit =
      selectedIndex >= 0 ? Math.max(PAGE_SIZE, selectedIndex + 1) : PAGE_SIZE
  }

  function loadMore() {
    displayLimit += PAGE_SIZE
  }

  function handleClose() {
    onClose()
  }

  $effect(() => {
    if (!open) {
      overlayReady = false
      return
    }

    untrack(resetPagination)
    overlayReady = false

    const timeout = window.setTimeout(() => {
      overlayReady = true
    }, 120)

    return () => window.clearTimeout(timeout)
  })

  $effect(() => {
    if (!open) return
    return registerEscapeHandler(handleClose)
  })

  $effect(() => {
    if (!open) return
    void items.length
    untrack(resetPagination)
  })
</script>

{#if open}
  <div class="ai-picker-layer" use:portal>
    <button
      type="button"
      class="overlay"
      class:ready={overlayReady}
      aria-label={t('cancel')}
      onclick={handleClose}
    ></button>

    <div class="modal" class:large role="dialog" aria-modal="true" aria-labelledby="ai-picker-title">
      <div class="modal-header">
        <div class="modal-header-copy">
          <h2 id="ai-picker-title">{title}</h2>
          {#if subtitle}
            <p>{subtitle}</p>
          {/if}
        </div>
        <div class="header-actions">
          {#if manageMode && showHeaderAdd && onAdd && addLabel}
            <button type="button" class="header-add-btn" onclick={onAdd}>
              {addLabel}
            </button>
          {/if}
          <button type="button" class="close-btn" onclick={handleClose} aria-label={t('cancel')}>
            <svg class="close-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M18 6L6 18M6 6l12 12"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {#if items.length === 0}
        <p class="empty">{emptyLabel}</p>
      {:else}
        <div class="picker-wrap">
          <div class="picker-list" role="listbox" aria-label={title}>
            {#each visibleItems as item (pickerItemKey(item))}
              <div
                class="picker-item"
                class:selected={selectedId === item.id}
                role="option"
                aria-selected={selectedId === item.id}
              >
                <button
                  type="button"
                  class="picker-select"
                  title={itemTitle(item)}
                  onclick={() => onSelect(item.id)}
                >
                  <span class="picker-line">{itemTitle(item)}</span>
                  {#if item.badge}
                    <span class="picker-badge">{item.badge}</span>
                  {/if}
                </button>

                {#if manageMode && item.manageActions !== false}
                  <div class="picker-item-actions">
                    {#if onEdit}
                      <button
                        type="button"
                        class="item-action-btn"
                        aria-label={t('edit')}
                        onclick={() => onEdit(item.id)}
                      >
                        {t('edit')}
                      </button>
                    {/if}
                    {#if onDelete}
                      <button
                        type="button"
                        class="item-action-btn danger"
                        aria-label={t('delete')}
                        onclick={() => onDelete(item.id)}
                      >
                        {t('delete')}
                      </button>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>

          {#if hasMore}
            <div class="load-more-wrap">
              <p class="load-more-info">
                {t('showingCount', { visible: visibleItems.length, total: items.length })}
              </p>
              <button type="button" class="load-more-btn" onclick={loadMore}>
                {t('loadMore')}
              </button>
            </div>
          {/if}
        </div>
      {/if}

      {#if form}
        <div class="picker-form">{@render form()}</div>
      {/if}

      {#if footer}
        <div class="picker-footer">{@render footer()}</div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    border: none;
    background: var(--overlay);
    z-index: 50;
    cursor: pointer;
    pointer-events: none;
  }

  .overlay.ready {
    pointer-events: auto;
  }

  .modal {
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(94vw, 420px);
    max-height: min(90vh, 720px);
    overflow-y: auto;
    padding: 1.25rem;
    border: 1px solid var(--border);
    border-radius: 18px;
    background: var(--surface);
    box-shadow: var(--shadow-lg);
    z-index: 51;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .modal.large {
    width: min(94vw, 560px);
    padding: 1.5rem 1.65rem;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    min-width: 0;
  }

  .modal-header-copy {
    min-width: 0;
    flex: 1;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-shrink: 0;
  }

  .header-add-btn {
    padding: 0.42rem 0.7rem;
    border: 1px solid color-mix(in srgb, var(--accent) 40%, var(--border));
    border-radius: 8px;
    background: color-mix(in srgb, var(--accent) 8%, var(--bg));
    color: var(--accent);
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }

  .modal-header h2 {
    margin: 0 0 0.25rem;
    font-size: 1.15rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .modal-header p,
  .empty {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.88rem;
    line-height: 1.5;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .close-btn {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: var(--bg);
    color: var(--text-muted);
    cursor: pointer;
    flex-shrink: 0;
  }

  .close-btn:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--text-muted) 10%, var(--bg));
  }

  .close-icon {
    width: 18px;
    height: 18px;
  }

  .picker-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    min-height: 0;
    width: 100%;
  }

  .picker-list {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.35rem;
    width: 100%;
    max-height: min(48vh, 360px);
    margin: 0;
    padding: 0;
    overflow-y: auto;
    overflow-x: hidden;
    box-sizing: border-box;
    scrollbar-width: thin;
  }

  .picker-list::-webkit-scrollbar {
    width: 6px;
  }

  .picker-list::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: color-mix(in srgb, var(--text-muted) 35%, transparent);
  }

  .modal.large .picker-list {
    max-height: min(52vh, 400px);
  }

  .picker-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    align-self: stretch;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
    flex-shrink: 0;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--bg);
    overflow: hidden;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }

  .picker-item.selected {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 6%, var(--bg));
  }

  .picker-select {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.55rem 0.65rem;
    border: none;
    background: transparent;
    color: var(--text);
    text-align: left;
    cursor: pointer;
  }

  .picker-line {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.82rem;
    font-weight: 600;
    line-height: 1.35;
  }

  .picker-badge {
    flex-shrink: 0;
    padding: 0.12rem 0.4rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    color: var(--accent);
    font-size: 0.64rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    white-space: nowrap;
  }

  .picker-item-actions {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    flex-shrink: 0;
    padding-right: 0.35rem;
  }

  .item-action-btn {
    padding: 0.28rem 0.45rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text-muted);
    font-size: 0.68rem;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }

  .item-action-btn:hover {
    color: var(--text);
    border-color: color-mix(in srgb, var(--accent) 30%, var(--border));
  }

  .item-action-btn.danger {
    color: var(--danger);
    border-color: color-mix(in srgb, var(--danger) 30%, var(--border));
    background: var(--danger-bg);
  }

  .item-action-btn.danger:hover {
    color: var(--danger);
    border-color: color-mix(in srgb, var(--danger) 45%, var(--border));
  }

  .load-more-wrap {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding-top: 0.1rem;
    flex-shrink: 0;
  }

  .load-more-info {
    margin: 0;
    font-size: 0.78rem;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .load-more-btn {
    padding: 0.45rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg);
    color: var(--text);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    flex-shrink: 0;
  }

  .load-more-btn:hover {
    border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
  }

  .picker-form {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    padding-top: 0.15rem;
    border-top: 1px solid var(--border);
  }

  .picker-footer {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    padding-top: 0.15rem;
    border-top: 1px solid var(--border);
  }
</style>
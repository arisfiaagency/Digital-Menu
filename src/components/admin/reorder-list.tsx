"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";

export interface ReorderableItem {
  id: string;
}

// A reusable reorder list that supports BOTH holding the grip and dragging a row,
// AND typing a position number to jump a row to that spot. The parent owns the
// order (passes `items`, gets `onReorder(next)`); this component is presentation
// + interaction only, so it can wrap menu items grouped per-category or a flat
// list of categories the same way.
export function ReorderList<T extends ReorderableItem>({
  items,
  onReorder,
  renderRow,
  reorderLabel,
  positionLabel,
  dir
}: {
  items: T[];
  onReorder: (next: T[]) => void;
  renderRow: (item: T) => ReactNode;
  reorderLabel: string;
  positionLabel: string;
  dir: "ltr" | "rtl";
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  function handlePointerDown(event: ReactPointerEvent, id: string) {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDraggingId(id);
  }

  function handlePointerMove(event: ReactPointerEvent) {
    if (!draggingId) return;
    const pointerY = event.clientY;
    const index = items.findIndex((entry) => entry.id === draggingId);
    if (index === -1) return;
    // Swap with the neighbour whose midpoint the pointer has crossed (one step per move — stable).
    if (index > 0) {
      const prev = rowRefs.current.get(items[index - 1].id);
      if (prev) {
        const rect = prev.getBoundingClientRect();
        if (pointerY < rect.top + rect.height / 2) {
          const next = [...items];
          [next[index - 1], next[index]] = [next[index], next[index - 1]];
          onReorder(next);
          return;
        }
      }
    }
    if (index < items.length - 1) {
      const following = rowRefs.current.get(items[index + 1].id);
      if (following) {
        const rect = following.getBoundingClientRect();
        if (pointerY > rect.top + rect.height / 2) {
          const next = [...items];
          [next[index + 1], next[index]] = [next[index], next[index + 1]];
          onReorder(next);
          return;
        }
      }
    }
  }

  function handlePointerUp() {
    setDraggingId(null);
  }

  function moveToPosition(id: string, position: number) {
    const from = items.findIndex((entry) => entry.id === id);
    if (from === -1) return;
    const to = Math.max(0, Math.min(items.length - 1, position - 1));
    if (to === from) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  }

  return (
    <ul className="reorder-list grid gap-2">
      {items.map((item, index) => (
        <li
          key={item.id}
          ref={(el) => {
            if (el) rowRefs.current.set(item.id, el);
            else rowRefs.current.delete(item.id);
          }}
          className={cn(
            "menu-reorder-item flex items-center gap-3 rounded-lg border bg-card p-3",
            draggingId === item.id && "is-dragging shadow-lg ring-2 ring-primary"
          )}
        >
          <button
            type="button"
            aria-label={reorderLabel}
            className="focus-ring touch-none cursor-grab rounded-md p-1 text-muted-foreground active:cursor-grabbing"
            onPointerDown={(event) => handlePointerDown(event, item.id)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <GripVertical className="h-5 w-5" aria-hidden />
          </button>
          <PositionInput
            index={index}
            total={items.length}
            label={positionLabel}
            dir={dir}
            onCommit={(position) => moveToPosition(item.id, position)}
          />
          {renderRow(item)}
        </li>
      ))}
    </ul>
  );
}

// A small number box showing the row's 1-based position. Type a number + Enter (or
// tab away) to jump the row there. It re-syncs to the live position after any drag.
function PositionInput({
  index,
  total,
  label,
  dir,
  onCommit
}: {
  index: number;
  total: number;
  label: string;
  dir: "ltr" | "rtl";
  onCommit: (position: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(String(index + 1));

  // Keep the shown number in sync with the row's real position when it changes from
  // dragging or another row's move — but never overwrite what's being typed.
  useEffect(() => {
    if (!focused) setDraft(String(index + 1));
  }, [index, focused]);

  function commit() {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isFinite(parsed)) onCommit(parsed);
    setDraft(String(index + 1));
  }

  return (
    <Input
      type="number"
      inputMode="numeric"
      dir={dir}
      aria-label={label}
      title={label}
      min={1}
      max={total}
      value={draft}
      className="h-9 w-14 shrink-0 px-2 text-center font-semibold"
      onFocus={(event) => {
        setFocused(true);
        event.currentTarget.select();
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}

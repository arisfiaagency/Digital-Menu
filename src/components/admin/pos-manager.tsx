"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import {
  Armchair,
  ArrowRightLeft,
  Check,
  Circle,
  DoorOpen,
  Droplets,
  Merge,
  Minus,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  RectangleHorizontal,
  RotateCw,
  Search,
  Sparkles,
  Table2,
  Trash2,
  Triangle,
  Umbrella,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminErrorText,
  useAdminLocale,
} from "@/components/admin/admin-preferences";
import { BRAND_AGENCY } from "@/components/brand-credit";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import {
  completePosOrder,
  getAdminAppData,
  getPosState,
  savePosState,
} from "@/lib/firebase/firestore";
import { localized } from "@/lib/i18n/config";
import type { LocaleDirection } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";
import { formatMoney, normalizeSearch, roundCashTotal } from "@/lib/utils/format";
import type {
  AppData,
  Currency,
  MenuItem,
  MenuVariant,
  PosCompletedOrder,
  PosDiscountType,
  PosOrderLine,
  PosShape,
  PosShapeKind,
  PosState,
  PosTable,
  PosTableArea,
  PosTableOrder,
  PosTableShape,
} from "@/types/models";

const emptyPosState: PosState = {
  tables: [],
  orders: {},
  completedOrders: [],
};

// Fallback when no service fee is configured in settings (settings → General).
const DEFAULT_SERVICE_FEE_PERCENT = 10;
const DEFAULT_SERVICE_FEE_RATE = DEFAULT_SERVICE_FEE_PERCENT / 100;

// Floor plan: a fixed logical canvas. Tables/shapes store x/y/w/h in these units;
// the board renders at this aspect ratio and scales to fit, so a square stays square
// and positions are device-independent (percent of the canvas). LTR coordinates.
const FLOOR_W = 1000;
const FLOOR_H = 700;
// Snap step for dragging/resizing — matches the blueprint grid so tables line up.
const FLOOR_GRID = 25;
const DEFAULT_TABLE_W = 150;
const DEFAULT_TABLE_H = 100;
const MIN_TABLE = 50;
const MIN_SHAPE = 25;
const FLOOR_COLS = 5;
// Default label sizes (logical units) and how close edges/centres must be to snap.
const DEFAULT_TABLE_FONT = 22;
const DEFAULT_SHAPE_FONT = 20;
const ALIGN_THRESHOLD = 8;

export function PosManager() {
  const { locale, text, dir: textDir } = useAdminLocale();
  const auth = useAdminAuth();
  // Editing the table layout (add/rename/delete tables) is an admin-only setup
  // task. Employees with POS access can still take, transfer, merge and complete
  // orders — they just can't change the tables themselves. Default-deny while the
  // profile is still loading so the edit control never flashes in for an employee
  // (roleOf(null) optimistically returns "admin").
  const canManageTables = !auth.loading && auth.role === "admin";
  // Display name of the signed-in staff member — used to stamp who took an order
  // (first item added) and who completed it.
  const currentActor =
    auth.profile?.displayName ||
    auth.profile?.username ||
    auth.user?.email ||
    "";
  const currentActorUid = auth.user?.uid;
  const [data, setData] = useState<AppData | null>(null);
  const [pos, setPos] = useState<PosState>(emptyPosState);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [discountInput, setDiscountInput] = useState("");
  const [tableAction, setTableAction] = useState<"move" | "merge" | null>(null);
  // The order line whose flavor popup is currently open (null = closed).
  const [flavorPickerLineId, setFlavorPickerLineId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const menuPickerRef = useRef<HTMLDivElement | null>(null);
  const pendingPickerScroll = useRef(false);

  // Only admins can edit the floor plan; everyone can view it and take orders.
  const [planEditing, setPlanEditing] = useState(false);

  useEffect(() => {
    Promise.all([getAdminAppData(), getPosState()])
      .then(([appData, posState]) => {
        const nextPos = normalizeTableOrder(posState);
        setData(appData);
        setPos(nextPos);
        // Start with no table selected — the POS stays locked until the user
        // taps a table (see the selected-table gate on the picker/summary).
        setSelectedTableId("");
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : text.settingsSaveFailed),
      );
  }, [text.settingsSaveFailed]);

  const tables = useMemo(
    () => [...pos.tables].sort((a, b) => a.displayOrder - b.displayOrder),
    [pos.tables],
  );
  const selectedTable =
    tables.find((table) => table.id === selectedTableId) || null;
  const selectedOrder = selectedTable
    ? orderForTable(selectedTable.id)
    : null;
  const posCurrency: Currency = data?.general.defaultCurrency ?? "IQD";
  // Service fee comes from settings (General → Service fee %), defaulting to 10%.
  const serviceFeePercent = Math.max(
    0,
    data?.general.serviceFeePercent ?? DEFAULT_SERVICE_FEE_PERCENT,
  );
  const serviceFeeRate = serviceFeePercent / 100;
  const flavorPickerLine =
    flavorPickerLineId != null
      ? selectedOrder?.lines.find((line) => line.id === flavorPickerLineId)
      : undefined;
  const flavorPickerOptions = parseFlavorOptions(
    flavorPickerLine
      ? data?.menuItems.find((item) => item.id === flavorPickerLine.itemId)
          ?.flavor
      : undefined,
  );
  const flavorPickerValue = flavorPickerLine?.flavor?.trim() || "";
  const categories = useMemo(
    () =>
      (data?.categories || [])
        .filter((category) => category.isActive)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [data?.categories],
  );
  const menuItems = useMemo(() => {
    const normalized = normalizeSearch(query);
    return (data?.menuItems || [])
      .filter((item) => item.isAvailable && !item.isSoldOut)
      .filter(
        (item) =>
          categoryFilter === "all" || item.categoryId === categoryFilter,
      )
      .filter((item) => {
        if (!normalized) return true;
        const category = data?.categories.find(
          (entry) => entry.id === item.categoryId,
        );
        return [
          ...Object.values(item.name),
          ...Object.values(item.description || {}),
          category ? localized(category.name, locale, category.name.en) : "",
        ]
          .map(normalizeSearch)
          .join(" ")
          .includes(normalized);
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [categoryFilter, data?.categories, data?.menuItems, locale, query]);
  const waterItems = useMemo(
    () =>
      (data?.menuItems || [])
        .filter((item) => item.isAvailable && !item.isSoldOut)
        .filter((item) => isWaterMenuItem(item, data?.categories || []))
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [data?.categories, data?.menuItems],
  );

  // Scroll down to the menu picker once it mounts after a table is selected.
  // The picker only renders when a table is selected, so the scroll must wait
  // for that render (an effect runs after commit, when the ref is attached).
  useEffect(() => {
    if (selectedTable && pendingPickerScroll.current) {
      pendingPickerScroll.current = false;
      menuPickerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedTable]);

  useEffect(() => {
    setTableAction(null);
  }, [selectedTableId]);

  // Mirror the order's discount into the editable field, but keep an empty field
  // empty (so backspacing the value to nothing clears the zero instead of snapping back).
  useEffect(() => {
    const numeric = selectedOrder?.discountValue ?? 0;
    setDiscountInput((current) => {
      if (current !== "" && Number(current) === numeric) return current;
      if (current === "" && numeric === 0) return current;
      return String(numeric);
    });
  }, [selectedTableId, selectedOrder?.discountValue]);

  async function persist(nextPos: PosState, nextMessage?: string) {
    const previousPos = pos;
    setPos(nextPos);
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await savePosState(nextPos);
      if (nextMessage) setMessage(nextMessage);
      return true;
    } catch (err) {
      setPos(previousPos);
      setError(err instanceof Error ? err.message : text.settingsSaveFailed);
      return false;
    } finally {
      setSaving(false);
    }
  }

  // Persist a floor-plan edit: tables ordered top-to-bottom then left-to-right,
  // orders of deleted tables pruned, decorative shapes stored.
  async function saveFloorPlan(nextTables: PosTable[], nextShapes: PosShape[]) {
    const ordered = [...nextTables]
      .sort(
        (a, b) =>
          tableAreas.indexOf(tableArea(a)) - tableAreas.indexOf(tableArea(b)) ||
          (a.y ?? 0) - (b.y ?? 0) ||
          (a.x ?? 0) - (b.x ?? 0),
      )
      .map((table, index) => ({ ...table, displayOrder: index }));
    const normalized = normalizeTableOrder({
      ...pos,
      tables: ordered,
    }).tables;
    const ids = new Set(normalized.map((table) => table.id));
    const nextOrders = Object.fromEntries(
      Object.entries(pos.orders).filter(([tableId]) => ids.has(tableId)),
    );
    const saved = await persist(
      { ...pos, tables: normalized, orders: nextOrders, shapes: nextShapes },
      text.layoutSaved,
    );
    if (saved) {
      // If the selected table was deleted, deselect (re-locks the POS) rather
      // than auto-jumping to another table.
      if (!ids.has(selectedTableId)) setSelectedTableId("");
      setPlanEditing(false);
    }
  }

  // The working order for a table. An empty table (no lines) is always treated
  // as a fresh order so its discount defaults to % — even if an old, already
  // cleared order was persisted here as an "amount" discount before that default
  // changed. Tables with items in progress keep their own saved discount type.
  function orderForTable(tableId: string): PosTableOrder {
    const stored = pos.orders[tableId];
    return stored && stored.lines.length ? stored : emptyOrder(tableId);
  }

  function updateOrder(updater: (order: PosTableOrder) => PosTableOrder) {
    if (!selectedTable) return;
    const current = orderForTable(selectedTable.id);
    const nextOrder: PosTableOrder = {
      ...updater(current),
      tableId: selectedTable.id,
      updatedAt: new Date().toISOString(),
    };
    // Stamp who took the order the moment it gains its first line.
    if (nextOrder.lines.length && !nextOrder.takenBy && currentActor) {
      nextOrder.takenBy = currentActor;
      nextOrder.takenByUid = currentActorUid;
    }
    void persist({
      ...pos,
      orders: {
        ...pos.orders,
        [selectedTable.id]: nextOrder,
      },
    });
  }

  function addMenuItem(item: MenuItem, variant?: MenuVariant) {
    const price = variant
      ? variant.price
      : item.discountPrice && item.discountPrice > 0
        ? item.discountPrice
        : item.basePrice;
    updateOrder((order) => {
      const existing = order.lines.find(
        (line) =>
          line.itemId === item.id &&
          line.unitPrice === price &&
          (line.variantId || "") === (variant?.id || "") &&
          !line.flavor,
      );
      const lines = existing
        ? order.lines.map((line) =>
            line.id === existing.id
              ? { ...line, quantity: line.quantity + 1 }
              : line,
          )
        : [
            ...order.lines,
            {
              id: crypto.randomUUID(),
              itemId: item.id,
              name: item.name,
              variantId: variant?.id,
              variantName: variant?.name,
              quantity: 1,
              unitPrice: price,
              currency: item.currency,
            },
          ];
      return { ...order, lines };
    });
  }

  function setLineFlavor(lineId: string, flavor: string) {
    if (!selectedTable) return;
    const order = orderForTable(selectedTable.id);
    const nextOrder = {
      ...order,
      lines: order.lines.map((line) =>
        line.id === lineId ? { ...line, flavor: flavor || undefined } : line,
      ),
      updatedAt: new Date().toISOString(),
    };
    void persist({
      ...pos,
      orders: { ...pos.orders, [selectedTable.id]: nextOrder },
    });
  }

  function changeLineQuantity(lineId: string, delta: number) {
    updateOrder((order) => ({
      ...order,
      lines: order.lines
        .map((line) =>
          line.id === lineId
            ? { ...line, quantity: line.quantity + delta }
            : line,
        )
        .filter((line) => line.quantity > 0),
    }));
  }

  function removeLine(lineId: string) {
    updateOrder((order) => ({
      ...order,
      lines: order.lines.filter((line) => line.id !== lineId),
    }));
  }

  function setDiscountType(discountType: PosDiscountType) {
    updateOrder((order) => ({ ...order, discountType }));
  }

  function setDiscountValue(discountValue: number) {
    updateOrder((order) => ({
      ...order,
      discountValue: Math.max(0, discountValue || 0),
    }));
  }

  async function completeOrder() {
    if (
      !selectedTable ||
      !selectedOrder ||
      !selectedOrder.lines.length ||
      !totals
    )
      return;
    const completedOrder: PosCompletedOrder = {
      id: crypto.randomUUID(),
      tableId: selectedTable.id,
      tableName: selectedTable.name,
      lines: selectedOrder.lines,
      discountType: selectedOrder.discountType,
      discountValue: selectedOrder.discountValue,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      serviceFeeRate,
      serviceFeeAmount: totals.serviceFeeAmount,
      total: totals.total,
      currency: totals.currency,
      completedAt: new Date().toISOString(),
      // Who built the order (falls back to the completer for pre-existing orders)
      // and who closed it out.
      takenBy: selectedOrder.takenBy || currentActor || undefined,
      takenByUid: selectedOrder.takenByUid || currentActorUid,
      completedBy: currentActor || undefined,
      completedByUid: currentActorUid,
    };

    const nextPos = {
      ...pos,
      completedOrders: [...(pos.completedOrders || []), completedOrder],
      orders: {
        ...pos.orders,
        [selectedTable.id]: emptyOrder(selectedTable.id),
      },
    };
    const previousPos = pos;
    setPos(nextPos);
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await completePosOrder(nextPos, completedOrder);
      setMessage(text.orderCompleted);
    } catch (err) {
      setPos(previousPos);
      setError(err instanceof Error ? err.message : text.settingsSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  function toggleTableAction(action: "move" | "merge") {
    if (!selectedTable || !selectedOrder?.lines.length) return;
    setTableAction((current) => (current === action ? null : action));
    setMessage("");
    setError("");
  }

  function pressTable(tableId: string) {
    if (tableAction === "move") {
      moveOrderToTable(tableId);
      return;
    }
    if (tableAction === "merge") {
      mergeOrderIntoTable(tableId);
      return;
    }
    // Deselect if the already-selected table is tapped again (re-locks the POS).
    if (tableId === selectedTableId) {
      setSelectedTableId("");
      return;
    }
    pendingPickerScroll.current = true;
    setSelectedTableId(tableId);
  }

  function moveOrderToTable(targetTableId: string) {
    if (!selectedTable || !selectedOrder?.lines.length) return;
    if (targetTableId === selectedTable.id) {
      setTableAction(null);
      return;
    }
    const targetTable = tables.find((table) => table.id === targetTableId);
    if (!targetTable) return;
    if (tableOrderLineCount(pos.orders[targetTable.id]) > 0) {
      setError(text.targetTableOccupied);
      return;
    }

    const movedOrder: PosTableOrder = {
      ...selectedOrder,
      tableId: targetTable.id,
      updatedAt: new Date().toISOString(),
    };

    void persist(
      {
        ...pos,
        orders: {
          ...pos.orders,
          [selectedTable.id]: emptyOrder(selectedTable.id),
          [targetTable.id]: movedOrder,
        },
      },
      text.orderMoved,
    ).then((saved) => {
      if (!saved) return;
      setSelectedTableId(targetTable.id);
      setTableAction(null);
    });
  }

  function mergeOrderIntoTable(targetTableId: string) {
    if (!selectedTable || !selectedOrder?.lines.length) return;
    if (targetTableId === selectedTable.id) {
      setTableAction(null);
      return;
    }
    const targetTable = tables.find((table) => table.id === targetTableId);
    if (!targetTable) return;

    const targetOrder =
      pos.orders[targetTable.id] || emptyOrder(targetTable.id);
    const mergedOrder: PosTableOrder = {
      ...targetOrder,
      tableId: targetTable.id,
      lines: mergeOrderLines(targetOrder.lines, selectedOrder.lines),
      updatedAt: new Date().toISOString(),
    };

    void persist(
      {
        ...pos,
        orders: {
          ...pos.orders,
          [selectedTable.id]: emptyOrder(selectedTable.id),
          [targetTable.id]: mergedOrder,
        },
      },
      text.orderMerged,
    ).then((saved) => {
      if (!saved) return;
      setSelectedTableId(targetTable.id);
      setTableAction(null);
      // Stay on the tables after merging (don't jump down to the menu picker).
    });
  }

  function printInvoice() {
    document.body.classList.add("pos-printing");
    const cleanup = () => document.body.classList.remove("pos-printing");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1000);
  }

  const totals = selectedOrder
    ? calculateTotals(selectedOrder, posCurrency, serviceFeeRate)
    : null;

  // Transfer / merge controls, shared by the grid and floor-plan views.
  const actionButtons = (
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        variant={tableAction === "merge" ? "default" : "outline"}
        size="icon"
        aria-label={text.mergeOrder}
        title={text.mergeOrder}
        onClick={() => toggleTableAction("merge")}
        disabled={!selectedOrder?.lines.length}>
        <Merge className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        type="button"
        variant={tableAction === "move" ? "default" : "outline"}
        size="icon"
        aria-label={text.moveOrder}
        title={text.moveOrder}
        onClick={() => toggleTableAction("move")}
        disabled={!selectedOrder?.lines.length}>
        <ArrowRightLeft className="h-4 w-4" aria-hidden />
      </Button>
    </div>
  );

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{text.pos}</h1>
          <p className="text-muted-foreground">{text.posDescription}</p>
        </div>
        {saving ? (
          <span className="rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground">
            {text.saving}
          </span>
        ) : null}
      </div>

      {message ? (
        <p className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm text-primary">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {adminErrorText(error, text)}
        </p>
      ) : null}

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Table2 className="h-5 w-5 text-primary" aria-hidden />
              {text.tables}
            </CardTitle>
            {canManageTables ? (
              <Button
                type="button"
                variant={planEditing ? "default" : "outline"}
                size="icon"
                aria-label={text.editLayout}
                title={text.editLayout}
                onClick={() => setPlanEditing((value) => !value)}>
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
            ) : null}
          </div>

          <div className="space-y-3">
            {planEditing && canManageTables ? (
              <p dir={textDir} className="text-xs text-muted-foreground">
                {text.floorPlanHint}
              </p>
            ) : null}
            <PosFloorPlan
              editing={planEditing && canManageTables}
              tables={tables}
              shapes={pos.shapes || []}
              orders={pos.orders}
              currency={posCurrency}
              serviceFeeRate={serviceFeeRate}
              locale={locale}
              textDir={textDir}
              text={text}
              selectedTableId={selectedTable?.id || ""}
              tableAction={tableAction}
              onSelectTable={pressTable}
              onSave={(nextTables, nextShapes) =>
                void saveFloorPlan(nextTables, nextShapes)
              }
              onCancelEdit={() => setPlanEditing(false)}
            />
            {!(planEditing && canManageTables) ? actionButtons : null}
          </div>
        </CardContent>
      </Card>

      {selectedTable ? (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div ref={menuPickerRef} className="min-h-0 scroll-mt-20">
          <Card className="min-h-0">
            <CardHeader>
              <CardTitle className="text-lg">{text.menuPicker}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p dir={textDir} className="text-sm text-muted-foreground">
                {text.tapItemsToAdd}
              </p>
              <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <label className="relative block">
                  <Search
                    className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    className="ps-10"
                    dir={textDir}
                    placeholder={text.searchItems}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <Select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}>
                  <option value="all">{text.allCategories}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {localized(category.name, locale, category.name.en)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="max-h-[640px] overflow-y-auto pr-1 xl:max-h-[calc(100vh-21rem)]">
                <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(17rem,1fr))]">
                  {menuItems.map((item) => {
                    const title = localized(item.name, locale, item.name.en);
                    const variants = item.variants.filter((variant) => variant.isAvailable);
                    const price =
                      item.discountPrice && item.discountPrice > 0
                        ? item.discountPrice
                        : item.basePrice;
                    const header = (
                      <div className="flex items-start gap-3">
                        <MenuPickerThumb src={item.imageUrl} alt={title} />
                        <span className="flex min-w-0 flex-1 items-start justify-between gap-2">
                          <span className="min-w-0">
                          <span
                            dir={textDir}
                            className="line-clamp-2 block font-semibold">
                            {title}
                          </span>
                          <span
                            dir={textDir}
                            className="mt-1 line-clamp-1 block text-xs text-muted-foreground">
                            {localized(
                              data?.categories.find(
                                (category) => category.id === item.categoryId,
                              )?.name,
                              locale,
                              text.noCategory,
                            )}
                          </span>
                          </span>
                          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                            {variants.length ? `${variants.length} ${text.variants}` : formatMoney(price, item.currency, locale)}
                          </span>
                        </span>
                      </div>
                    );
                    // No variants: the whole card is tap-to-add. With variants the card can't be a
                    // button (each variant is its own button inside), so those stay tap-per-variant.
                    if (!variants.length) {
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addMenuItem(item)}
                          className="focus-ring flex min-h-24 w-full flex-col gap-3 rounded-lg border bg-card p-3 text-start transition-[transform,background-color,border-color] duration-200 hover:border-primary/40 hover:bg-muted/50 active:scale-[0.98]">
                          {header}
                        </button>
                      );
                    }
                    return (
                      <div
                        key={item.id}
                        className="flex min-h-24 flex-col gap-3 rounded-lg border bg-card p-3 text-start transition-colors hover:border-primary/40">
                        {header}
                        <div className="grid gap-1.5">
                          {variants.map((variant) => (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => addMenuItem(item, variant)}
                              className="focus-ring flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm transition-transform hover:bg-muted active:scale-[0.98]">
                              <span dir={textDir} className="truncate font-medium">{localized(variant.name, locale, variant.name.en)}</span>
                              <span className="shrink-0 font-semibold text-primary">{formatMoney(variant.price, item.currency, locale)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ReceiptText className="h-5 w-5 text-primary" aria-hidden />
              {text.orderSummary}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTable && selectedOrder && totals ? (
              <>
                <div className="rounded-lg border bg-muted/25 p-3">
                  <p dir={textDir} className="font-semibold">
                    {tableLabel(selectedTable, locale)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date().toLocaleString(
                      locale === "ckb" ? "ar-IQ" : locale,
                    )}
                  </p>
                </div>

                {waterItems.length ? (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <p dir={textDir} className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                      <Droplets className="h-4 w-4" aria-hidden />
                      {text.quickWater}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {waterItems.flatMap((item) => {
                        const variants = item.variants.filter((variant) => variant.isAvailable);
                        const options: (MenuVariant | undefined)[] = variants.length ? variants : [undefined];
                        return options.map((variant) => (
                          <Button key={`${item.id}-${variant?.id || "base"}`} type="button" variant="outline" size="sm" onClick={() => addMenuItem(item, variant)}>
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                            <span dir={textDir}>{localized(item.name, locale, item.name.en)}{variant ? ` · ${localized(variant.name, locale, variant.name.en)}` : ""}</span>
                          </Button>
                        ));
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  {selectedOrder.lines.length ? (
                    selectedOrder.lines.map((line) => (
                      <div
                        key={line.id}
                        className="grid grid-cols-[1fr_auto] gap-3 rounded-lg border p-3">
                        <div className="min-w-0">
                          <p
                            dir={textDir}
                            className="line-clamp-2 text-sm font-semibold">
                            {localized(line.name, locale)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatMoney(line.unitPrice, line.currency, locale)}
                          </p>
                          {line.variantName ? (
                            <p dir={textDir} className="mt-1 text-xs font-medium text-primary">
                              {text.variant}: {localized(line.variantName, locale, line.variantName.en)}
                            </p>
                          ) : null}
                          <button
                            type="button"
                            dir={textDir}
                            onClick={() => setFlavorPickerLineId(line.id)}
                            className={cn(
                              "mt-2 flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-xs transition",
                              line.flavor?.trim()
                                ? "border-primary/40 bg-primary/5 font-medium text-primary"
                                : "border-dashed text-muted-foreground hover:border-primary/40 hover:text-primary",
                            )}>
                            <Sparkles
                              className="h-3.5 w-3.5 shrink-0"
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {line.flavor?.trim() || text.addFlavor}
                            </span>
                          </button>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Decrease"
                            onClick={() => changeLineQuantity(line.id, -1)}>
                            <Minus className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                          <span className="w-8 text-center text-sm font-semibold">
                            {line.quantity}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Increase"
                            onClick={() => changeLineQuantity(line.id, 1)}>
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            aria-label={text.remove}
                            onClick={() => removeLine(line.id)}>
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p
                      dir={textDir}
                      className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                      {text.noItemsOnTable}
                    </p>
                  )}
                </div>

                <div className="grid gap-3 rounded-lg border p-3">
                  <div className="grid grid-cols-[140px_1fr] gap-2">
                    <Select
                      value={selectedOrder.discountType}
                      aria-label={text.discount}
                      title={
                        selectedOrder.discountType === "percent"
                          ? text.percentDiscount
                          : text.amountDiscount
                      }
                      onChange={(event) =>
                        setDiscountType(event.target.value as PosDiscountType)
                      }>
                      <option value="amount">{totals.currency}</option>
                      <option value="percent">%</option>
                    </Select>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={
                        selectedOrder.discountType === "percent"
                          ? 100
                          : undefined
                      }
                      placeholder="0"
                      value={discountInput}
                      onFocus={(event) => event.currentTarget.select()}
                      onClick={(event) => event.currentTarget.select()}
                      onChange={(event) => {
                        setDiscountInput(event.target.value);
                        setDiscountValue(Number(event.target.value));
                      }}
                    />
                  </div>
                  <TotalRow
                    label={text.subtotal}
                    value={formatMoney(
                      totals.subtotal,
                      totals.currency,
                      locale,
                    )}
                  />
                  <TotalRow
                    label={text.discount}
                    value={`-${formatMoney(totals.discountAmount, totals.currency, locale)}`}
                  />
                  {totals.serviceFeeAmount > 0 ? (
                    <TotalRow
                      label={serviceFeeLabel(locale, serviceFeePercent)}
                      value={formatMoney(
                        totals.serviceFeeAmount,
                        totals.currency,
                        locale,
                      )}
                    />
                  ) : null}
                  <TotalRow
                    label={text.total}
                    value={formatMoney(totals.total, totals.currency, locale)}
                    strong
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    onClick={() => void completeOrder()}
                    disabled={!selectedOrder.lines.length}>
                    {text.completeOrder}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={printInvoice}
                    disabled={!selectedOrder.lines.length}>
                    <Printer className="h-4 w-4" aria-hidden />
                    {text.printInvoice}
                  </Button>
                </div>

                <ReceiptPreview
                  table={selectedTable}
                  order={selectedOrder}
                  totals={totals}
                  locale={locale}
                  serviceFeePercent={serviceFeePercent}
                  restaurantName={localized(data?.general.restaurantName, locale, "Cafe")}
                />
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 p-10 text-center">
            <Table2 className="h-8 w-8 text-muted-foreground" aria-hidden />
            <p dir={textDir} className="font-semibold">
              {text.selectTablePrompt}
            </p>
            <p dir={textDir} className="max-w-xs text-sm text-muted-foreground">
              {text.selectTableHint}
            </p>
          </CardContent>
        </Card>
      )}

      <FlavorPicker
        open={flavorPickerLine != null}
        title={text.selectFlavor}
        options={flavorPickerOptions}
        value={flavorPickerValue}
        dir={textDir}
        labels={{
          none: text.noFlavor,
          custom: text.customFlavor,
          save: text.save,
          cancel: text.cancel,
          placeholder: text.flavorPlaceholder,
        }}
        onSelect={(flavor) => {
          if (flavorPickerLineId) setLineFlavor(flavorPickerLineId, flavor);
          setFlavorPickerLineId(null);
        }}
        onClose={() => setFlavorPickerLineId(null)}
      />
    </div>
  );
}

const tableAreas: PosTableArea[] = ["indoor", "outdoor"];

// Shared 3-state tile colouring (empty / occupied / selected) + move/merge target
// highlight. Used by both the grid tiles and the floor-plan tiles so they never drift.
function tableStateClass(state: {
  selected: boolean;
  occupied: boolean;
  actionTarget: boolean;
  blockedTarget: boolean;
}): string {
  return cn(
    state.selected
      ? "border-primary bg-primary text-primary-foreground shadow-sm pos-tile-pop"
      : state.occupied
        ? "border-secondary bg-secondary/10 ring-1 ring-inset ring-secondary/40 hover:bg-secondary/20 pos-tile-glow"
        : "border-dashed bg-card hover:bg-muted",
    state.actionTarget && "ring-2 ring-primary/40",
    state.blockedTarget && "opacity-60",
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

// Default grid-flow position for a table that has never been placed on the plan,
// so a fresh floor plan is immediately usable before any dragging.
function defaultTablePosition(index: number) {
  const col = index % FLOOR_COLS;
  const row = Math.floor(index / FLOOR_COLS);
  const cellW = FLOOR_W / FLOOR_COLS;
  const cellH = 155;
  return {
    x: clamp(
      Math.round(col * cellW + (cellW - DEFAULT_TABLE_W) / 2),
      0,
      FLOOR_W - DEFAULT_TABLE_W,
    ),
    y: clamp(Math.round(24 + row * cellH), 0, FLOOR_H - DEFAULT_TABLE_H),
    w: DEFAULT_TABLE_W,
    h: DEFAULT_TABLE_H,
  };
}

// Fill in geometry for any table that lacks it (single default flow, since the
// board shows indoor + outdoor together) so unplaced tables still appear on the
// plan. Placed tables keep their stored coordinates.
function withResolvedPositions(tables: PosTable[]): PosTable[] {
  let unplaced = 0;
  return tables.map((table) => {
    if (Number.isFinite(table.x) && Number.isFinite(table.y)) {
      return {
        ...table,
        w: table.w ?? DEFAULT_TABLE_W,
        h: table.h ?? DEFAULT_TABLE_H,
        shape: table.shape ?? "rounded",
      };
    }
    return {
      ...table,
      ...defaultTablePosition(unplaced++),
      shape: table.shape ?? "rounded",
    };
  });
}

function boxStyleFor(el: {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  rotation?: number;
}): CSSProperties {
  const x = el.x ?? 0;
  const y = el.y ?? 0;
  const w = el.w ?? DEFAULT_TABLE_W;
  const h = el.h ?? DEFAULT_TABLE_H;
  return {
    left: `${(x / FLOOR_W) * 100}%`,
    top: `${(y / FLOOR_H) * 100}%`,
    width: `${(w / FLOOR_W) * 100}%`,
    height: `${(h / FLOOR_H) * 100}%`,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
  };
}

function tableShapeRadius(shape?: PosTableShape): string {
  return shape === "circle"
    ? "rounded-full"
    : shape === "square"
      ? "rounded-md"
      : "rounded-2xl";
}

// Faint outline that fills the element's box, drawn behind tables. Purely visual.
function ShapeView({ kind }: { kind: PosShapeKind }) {
  if (kind === "circle")
    return (
      <div className="h-full w-full rounded-full border-2 border-foreground/25 bg-foreground/5" />
    );
  if (kind === "wall")
    return <div className="h-full w-full rounded-sm bg-foreground/30" />;
  if (kind === "door")
    return (
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full text-foreground/45"
        aria-hidden>
        {/* Architectural door: hinge wall, swinging leaf, and the swing arc. */}
        <line
          x1="6"
          y1="94"
          x2="6"
          y2="10"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M6 10 A 84 84 0 0 1 90 94"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="7 6"
        />
        <line
          x1="6"
          y1="94"
          x2="92"
          y2="94"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
    );
  if (kind === "triangle")
    return (
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full text-foreground/30"
        aria-hidden>
        <polygon
          points="50,4 96,96 4,96"
          fill="currentColor"
          fillOpacity="0.08"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
    );
  return (
    <div className="h-full w-full rounded-md border-2 border-foreground/25 bg-foreground/5" />
  );
}

// Snap a logical coordinate/size to the blueprint grid so items line up.
function snapToGrid(value: number): number {
  return Math.round(value / FLOOR_GRID) * FLOOR_GRID;
}

// Localized table label: the per-language override for the current admin language,
// falling back to the canonical English `name`.
function tableLabel(table: PosTable, locale: "en" | "ar" | "ckb"): string {
  if (locale !== "en" && table.names?.[locale]) return table.names[locale] as string;
  return table.name;
}

// A numeric field that behaves normally: select-all on focus, free typing/clearing
// via a local string draft, commit on change/blur. Fixes the "can't edit the value"
// problem of a hard-controlled number input.
function PlanNumberField({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (next: number) => void;
}) {
  const [draft, setDraft] = useState(() => String(Math.round(value)));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(String(Math.round(value)));
  }, [value, focused]);
  return (
    <Input
      type="number"
      inputMode="numeric"
      value={draft}
      onFocus={(event) => {
        setFocused(true);
        event.target.select();
      }}
      onChange={(event) => {
        setDraft(event.target.value);
        const parsed = Number(event.target.value);
        if (event.target.value !== "" && Number.isFinite(parsed)) onCommit(parsed);
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = Number(draft);
        if (draft === "" || !Number.isFinite(parsed))
          setDraft(String(Math.round(value)));
        else onCommit(parsed);
      }}
    />
  );
}

const RESIZE_CORNERS = ["nw", "ne", "sw", "se"] as const;
type ResizeCorner = (typeof RESIZE_CORNERS)[number];

// Selection ring + rotate knob + 4 corner resize handles, drawn on the selected
// element so everything can be done with the mouse (no need for the form).
function SelectionOverlay({
  onResize,
  onRotate,
}: {
  onResize: (event: ReactPointerEvent, corner: ResizeCorner) => void;
  onRotate: (event: ReactPointerEvent) => void;
}) {
  return (
    <>
      <span className="pointer-events-none absolute -inset-1 rounded-md ring-2 ring-primary" />
      <span className="pointer-events-none absolute -top-6 left-1/2 h-6 w-px -translate-x-1/2 bg-primary/50" />
      <span
        onPointerDown={onRotate}
        title="Rotate"
        className="absolute -top-8 left-1/2 z-30 flex h-5 w-5 -translate-x-1/2 cursor-grab touch-none items-center justify-center rounded-full border-2 border-primary bg-background">
        <RotateCw className="h-3 w-3 text-primary" aria-hidden />
      </span>
      {RESIZE_CORNERS.map((corner) => (
        <span
          key={corner}
          onPointerDown={(event) => onResize(event, corner)}
          className={cn(
            "absolute z-30 h-3.5 w-3.5 touch-none rounded-full border-2 border-primary bg-background",
            corner === "nw" && "-left-1.5 -top-1.5 cursor-nwse-resize",
            corner === "ne" && "-right-1.5 -top-1.5 cursor-nesw-resize",
            corner === "sw" && "-bottom-1.5 -left-1.5 cursor-nesw-resize",
            corner === "se" && "-bottom-1.5 -right-1.5 cursor-nwse-resize",
          )}
        />
      ))}
    </>
  );
}


// The POS floor plan: a spatial view of the tables + café features (pillars, walls…).
// View mode is for everyone (tap a table to take its order); edit mode (admin only)
// lets you drag/resize/rotate tables and add/resize shapes on a draft, then Save.
// Nearest edge/centre alignment for one axis; returns the snapped value + guide line.
function snapAxis(
  pos: number,
  size: number,
  lines: number[],
): { value: number; line: number } | null {
  const anchors = [pos, pos + size / 2, pos + size];
  let best: { diff: number; line: number } | null = null;
  for (const anchor of anchors) {
    for (const line of lines) {
      const diff = line - anchor;
      if (
        Math.abs(diff) <= ALIGN_THRESHOLD &&
        (!best || Math.abs(diff) < Math.abs(best.diff))
      ) {
        best = { diff, line };
      }
    }
  }
  return best ? { value: pos + best.diff, line: best.line } : null;
}

// Axis-separated collision: a dragged box stops at another element's edge instead
// of overlapping it (edges may touch). Uses the box's start position as reference.
function resolveCollision(
  origX: number,
  origY: number,
  targetX: number,
  targetY: number,
  w: number,
  h: number,
  others: { x: number; y: number; w: number; h: number }[],
): { x: number; y: number } {
  let x = targetX;
  for (const o of others) {
    const overlapY = origY < o.y + o.h && origY + h > o.y;
    if (!overlapY) continue;
    if (targetX > origX && origX + w <= o.x && x + w > o.x) x = Math.min(x, o.x - w);
    else if (targetX < origX && origX >= o.x + o.w && x < o.x + o.w)
      x = Math.max(x, o.x + o.w);
  }
  let y = targetY;
  for (const o of others) {
    const overlapX = x < o.x + o.w && x + w > o.x;
    if (!overlapX) continue;
    if (targetY > origY && origY + h <= o.y && y + h > o.y) y = Math.min(y, o.y - h);
    else if (targetY < origY && origY >= o.y + o.h && y < o.y + o.h)
      y = Math.max(y, o.y + o.h);
  }
  return { x, y };
}

// The POS floor plan: one board showing indoor + outdoor together. View mode is for
// everyone (tap a table to take its order); edit mode (admin) lets you drag/resize/
// rotate/multi-select tables + shapes with alignment guides, then Save.
function PosFloorPlan({
  editing,
  tables,
  shapes,
  orders,
  currency,
  serviceFeeRate,
  locale,
  textDir,
  text,
  selectedTableId,
  tableAction,
  onSelectTable,
  onSave,
  onCancelEdit,
}: {
  editing: boolean;
  tables: PosTable[];
  shapes: PosShape[];
  orders: PosState["orders"];
  currency: Currency;
  serviceFeeRate: number;
  locale: "en" | "ar" | "ckb";
  textDir: "ltr" | "rtl";
  text: Record<string, string>;
  selectedTableId: string;
  tableAction: "move" | "merge" | null;
  onSelectTable: (id: string) => void;
  onSave: (tables: PosTable[], shapes: PosShape[]) => void;
  onCancelEdit: () => void;
}) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [draftTables, setDraftTables] = useState<PosTable[]>(tables);
  const [draftShapes, setDraftShapes] = useState<PosShape[]>(shapes);
  // Multi-select: keys are "table:<id>" / "shape:<id>".
  const [selection, setSelection] = useState<string[]>([]);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({
    x: [],
    y: [],
  });
  const [guidesOn, setGuidesOn] = useState(false);
  // Clipboard for copy/paste (Ctrl/Cmd+C, Ctrl/Cmd+V). Holds cloned elements;
  // each paste cascades a little further so copies don't stack exactly.
  const clipboardRef = useRef<{ tables: PosTable[]; shapes: PosShape[] } | null>(
    null,
  );
  const pasteOffsetRef = useRef(0);
  const dragRef = useRef<{
    mode: "move" | "resize" | "rotate";
    startX: number;
    startY: number;
    scale: number;
    items?: {
      type: "table" | "shape";
      id: string;
      origX: number;
      origY: number;
    }[];
    groupX?: number;
    groupY?: number;
    groupW?: number;
    groupH?: number;
    groupRotation?: number;
    others?: { x: number; y: number; w: number; h: number }[];
    type?: "table" | "shape";
    id?: string;
    corner?: ResizeCorner;
    origX?: number;
    origY?: number;
    origW?: number;
    origH?: number;
    origRotation?: number;
    centerX?: number;
    centerY?: number;
    startAngle?: number;
  } | null>(null);

  useEffect(() => {
    if (!editing) return;
    setDraftTables(withResolvedPositions(tables));
    setDraftShapes(shapes.map((shape) => ({ ...shape })));
    setSelection([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const viewTables = useMemo(() => withResolvedPositions(tables), [tables]);
  const boardTables = editing ? draftTables : viewTables;
  const boardShapes = editing ? draftShapes : shapes;

  function selKey(type: "table" | "shape", id: string) {
    return `${type}:${id}`;
  }
  function isSelected(type: "table" | "shape", id: string) {
    return selection.includes(selKey(type, id));
  }
  function findTable(id: string) {
    return draftTables.find((table) => table.id === id);
  }
  function findShape(id: string) {
    return draftShapes.find((shape) => shape.id === id);
  }
  function geomOf(type: "table" | "shape", id: string) {
    const el = type === "table" ? findTable(id) : findShape(id);
    if (!el) return null;
    return {
      x: el.x ?? 0,
      y: el.y ?? 0,
      w: el.w ?? DEFAULT_TABLE_W,
      h: el.h ?? DEFAULT_TABLE_H,
      rotation: el.rotation ?? 0,
    };
  }

  const soleSelection =
    selection.length === 1
      ? (() => {
          const [type, id] = selection[0].split(":") as [
            "table" | "shape",
            string,
          ];
          const el = type === "table" ? findTable(id) : findShape(id);
          return el ? { type, id, el } : null;
        })()
      : null;

  function boardScale() {
    const rect = boardRef.current?.getBoundingClientRect();
    return FLOOR_W / (rect?.width || FLOOR_W);
  }

  function patchTable(id: string, patch: Partial<PosTable>) {
    setDraftTables((current) =>
      current.map((table) => (table.id === id ? { ...table, ...patch } : table)),
    );
  }
  function patchShape(id: string, patch: Partial<PosShape>) {
    setDraftShapes((current) =>
      current.map((shape) => (shape.id === id ? { ...shape, ...patch } : shape)),
    );
  }
  function updateEl(
    type: "table" | "shape",
    id: string,
    patch: Partial<PosTable> & Partial<PosShape>,
  ) {
    if (type === "table") patchTable(id, patch);
    else patchShape(id, patch);
  }

  function allGeom() {
    return [
      ...draftTables.map((table) => ({
        key: selKey("table", table.id),
        x: table.x ?? 0,
        y: table.y ?? 0,
        w: table.w ?? DEFAULT_TABLE_W,
        h: table.h ?? DEFAULT_TABLE_H,
      })),
      ...draftShapes.map((shape) => ({
        key: selKey("shape", shape.id),
        x: shape.x,
        y: shape.y,
        w: shape.w,
        h: shape.h,
      })),
    ];
  }

  function onElementPointerDown(
    event: ReactPointerEvent,
    type: "table" | "shape",
    id: string,
  ) {
    if (!editing) return;
    event.stopPropagation();
    boardRef.current?.focus();
    const key = selKey(type, id);
    if (event.shiftKey) {
      setSelection((current) =>
        current.includes(key)
          ? current.filter((entry) => entry !== key)
          : [...current, key],
      );
      return;
    }
    const movingMulti = selection.includes(key) && selection.length > 1;
    const moveKeys = movingMulti ? selection : [key];
    if (!movingMulti) setSelection([key]);
    beginMove(event, moveKeys);
  }

  function beginMove(event: ReactPointerEvent, keys: string[]) {
    const items = keys
      .map((key) => {
        const [type, id] = key.split(":") as ["table" | "shape", string];
        const geom = geomOf(type, id);
        return geom ? { type, id, origX: geom.x, origY: geom.y } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    if (!items.length) return;
    const boxes = items.map((item) => geomOf(item.type, item.id)!);
    const gx = Math.min(...boxes.map((box) => box.x));
    const gy = Math.min(...boxes.map((box) => box.y));
    const gr = Math.max(...boxes.map((box) => box.x + box.w));
    const gb = Math.max(...boxes.map((box) => box.y + box.h));
    const others = allGeom()
      .filter((geom) => !keys.includes(geom.key))
      .map(({ x, y, w, h }) => ({ x, y, w, h }));
    // For a single element, remember its rotation so the board clamp keeps its
    // *visual* (rotated) box on-board instead of its unrotated box.
    const groupRotation =
      items.length === 1
        ? geomOf(items[0].type, items[0].id)?.rotation ?? 0
        : 0;
    dragRef.current = {
      mode: "move",
      startX: event.clientX,
      startY: event.clientY,
      scale: boardScale(),
      items,
      groupX: gx,
      groupY: gy,
      groupW: gr - gx,
      groupH: gb - gy,
      groupRotation,
      others,
    };
  }

  function beginResize(
    event: ReactPointerEvent,
    type: "table" | "shape",
    id: string,
    corner: ResizeCorner,
  ) {
    if (!editing) return;
    event.stopPropagation();
    boardRef.current?.focus();
    const geom = geomOf(type, id);
    if (!geom) return;
    dragRef.current = {
      mode: "resize",
      startX: event.clientX,
      startY: event.clientY,
      scale: boardScale(),
      type,
      id,
      corner,
      origX: geom.x,
      origY: geom.y,
      origW: geom.w,
      origH: geom.h,
    };
  }

  function beginRotate(
    event: ReactPointerEvent,
    type: "table" | "shape",
    id: string,
  ) {
    if (!editing) return;
    event.stopPropagation();
    boardRef.current?.focus();
    const rect = boardRef.current?.getBoundingClientRect();
    const geom = geomOf(type, id);
    if (!geom || !rect) return;
    const centerX = rect.left + ((geom.x + geom.w / 2) / FLOOR_W) * rect.width;
    const centerY = rect.top + ((geom.y + geom.h / 2) / FLOOR_H) * rect.height;
    dragRef.current = {
      mode: "rotate",
      startX: event.clientX,
      startY: event.clientY,
      scale: boardScale(),
      type,
      id,
      origRotation: geom.rotation,
      centerX,
      centerY,
      startAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX),
    };
  }

  useEffect(() => {
    if (!editing) return;
    function onMove(event: globalThis.PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;

      if (drag.mode === "rotate") {
        const angle = Math.atan2(
          event.clientY - (drag.centerY ?? 0),
          event.clientX - (drag.centerX ?? 0),
        );
        let degrees =
          (drag.origRotation ?? 0) +
          ((angle - (drag.startAngle ?? 0)) * 180) / Math.PI;
        degrees = Math.round(degrees / 15) * 15;
        if (drag.type && drag.id)
          updateEl(drag.type, drag.id, {
            rotation: ((degrees % 360) + 360) % 360,
          });
        return;
      }

      const dx = (event.clientX - drag.startX) * drag.scale;
      const dy = (event.clientY - drag.startY) * drag.scale;

      if (drag.mode === "resize" && drag.type && drag.id) {
        const minSize = drag.type === "table" ? MIN_TABLE : MIN_SHAPE;
        const corner = drag.corner ?? "se";
        let x = drag.origX ?? 0;
        let y = drag.origY ?? 0;
        let w = drag.origW ?? DEFAULT_TABLE_W;
        let h = drag.origH ?? DEFAULT_TABLE_H;
        if (corner.includes("e")) w = (drag.origW ?? 0) + dx;
        if (corner.includes("s")) h = (drag.origH ?? 0) + dy;
        if (corner.includes("w")) {
          x = (drag.origX ?? 0) + dx;
          w = (drag.origW ?? 0) - dx;
        }
        if (corner.includes("n")) {
          y = (drag.origY ?? 0) + dy;
          h = (drag.origH ?? 0) - dy;
        }
        w = snapToGrid(w);
        h = snapToGrid(h);
        if (corner.includes("w")) x = snapToGrid(x);
        if (corner.includes("n")) y = snapToGrid(y);
        if (w < minSize) {
          if (corner.includes("w")) x = (drag.origX ?? 0) + (drag.origW ?? 0) - minSize;
          w = minSize;
        }
        if (h < minSize) {
          if (corner.includes("n")) y = (drag.origY ?? 0) + (drag.origH ?? 0) - minSize;
          h = minSize;
        }
        x = clamp(x, 0, FLOOR_W - minSize);
        y = clamp(y, 0, FLOOR_H - minSize);
        w = Math.min(w, FLOOR_W - x);
        h = Math.min(h, FLOOR_H - y);
        updateEl(drag.type, drag.id, { x, y, w, h });
        return;
      }

      // move (single or group), with alignment snapping + guides
      const items = drag.items ?? [];
      const gW = drag.groupW ?? 0;
      const gH = drag.groupH ?? 0;
      const others = drag.others ?? [];
      let gx = (drag.groupX ?? 0) + dx;
      let gy = (drag.groupY ?? 0) + dy;
      const guideX: number[] = [];
      const guideY: number[] = [];

      const otherXLines = others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w]);
      const otherYLines = others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h]);
      const snapX = snapAxis(gx, gW, [
        ...otherXLines,
        0,
        FLOOR_W / 2,
        FLOOR_W,
      ]);
      if (snapX) {
        gx = snapX.value;
        guideX.push(snapX.line);
      } else gx = snapToGrid(gx);
      const snapY = snapAxis(gy, gH, [
        ...otherYLines,
        0,
        FLOOR_H / 2,
        FLOOR_H,
      ]);
      if (snapY) {
        gy = snapY.value;
        guideY.push(snapY.line);
      } else gy = snapToGrid(gy);

      // Only tables avoid overlap (so two tables never stack). Shapes (walls,
      // pillars, doors) are structural reference and can slide freely to the
      // room edges, even past a table.
      if (items.length === 1 && items[0].type === "table") {
        const resolved = resolveCollision(
          drag.groupX ?? 0,
          drag.groupY ?? 0,
          gx,
          gy,
          gW,
          gH,
          others,
        );
        gx = resolved.x;
        gy = resolved.y;
      }

      // Keep the element on the board. For a rotated single element, clamp its
      // rotated bounding box (so a wall turned 90° can still sit flush to an edge);
      // rotation 0 reduces to the plain box clamp.
      const rot = ((drag.groupRotation ?? 0) * Math.PI) / 180;
      const halfW =
        Math.abs((gW / 2) * Math.cos(rot)) + Math.abs((gH / 2) * Math.sin(rot));
      const halfH =
        Math.abs((gW / 2) * Math.sin(rot)) + Math.abs((gH / 2) * Math.cos(rot));
      const centerX = clamp(gx + gW / 2, halfW, FLOOR_W - halfW);
      const centerY = clamp(gy + gH / 2, halfH, FLOOR_H - halfH);
      gx = centerX - gW / 2;
      gy = centerY - gH / 2;
      const deltaX = gx - (drag.groupX ?? 0);
      const deltaY = gy - (drag.groupY ?? 0);

      const moves = new Map<string, { x: number; y: number }>();
      for (const item of items)
        moves.set(selKey(item.type, item.id), {
          x: item.origX + deltaX,
          y: item.origY + deltaY,
        });
      setDraftTables((current) =>
        current.map((table) => {
          const move = moves.get(selKey("table", table.id));
          return move ? { ...table, x: move.x, y: move.y } : table;
        }),
      );
      setDraftShapes((current) =>
        current.map((shape) => {
          const move = moves.get(selKey("shape", shape.id));
          return move ? { ...shape, x: move.x, y: move.y } : shape;
        }),
      );
      setGuides({ x: guideX, y: guideY });
      setGuidesOn(true);
    }
    function onUp() {
      if (dragRef.current?.mode === "move") {
        setGuidesOn(false);
        window.setTimeout(() => setGuides({ x: [], y: [] }), 220);
      }
      dragRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  function onBoardKeyDown(event: ReactKeyboardEvent) {
    if (!editing) return;
    const mod = event.ctrlKey || event.metaKey;
    if (mod && (event.key === "c" || event.key === "C")) {
      if (selection.length) {
        event.preventDefault();
        copySelection();
      }
      return;
    }
    if (mod && (event.key === "v" || event.key === "V")) {
      if (clipboardRef.current) {
        event.preventDefault();
        pasteClipboard();
      }
      return;
    }
    if (!selection.length) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deleteSelection();
      return;
    }
    const step = event.shiftKey ? FLOOR_GRID : 1;
    let dx = 0;
    let dy = 0;
    if (event.key === "ArrowLeft") dx = -step;
    else if (event.key === "ArrowRight") dx = step;
    else if (event.key === "ArrowUp") dy = -step;
    else if (event.key === "ArrowDown") dy = step;
    else return;
    event.preventDefault();
    const keys = new Set(selection);
    setDraftTables((current) =>
      current.map((table) =>
        keys.has(selKey("table", table.id))
          ? {
              ...table,
              x: clamp((table.x ?? 0) + dx, 0, FLOOR_W - (table.w ?? DEFAULT_TABLE_W)),
              y: clamp((table.y ?? 0) + dy, 0, FLOOR_H - (table.h ?? DEFAULT_TABLE_H)),
            }
          : table,
      ),
    );
    setDraftShapes((current) =>
      current.map((shape) =>
        keys.has(selKey("shape", shape.id))
          ? {
              ...shape,
              x: clamp(shape.x + dx, 0, FLOOR_W - shape.w),
              y: clamp(shape.y + dy, 0, FLOOR_H - shape.h),
            }
          : shape,
      ),
    );
  }

  function setTableName(loc: "en" | "ar" | "ckb", value: string, id: string) {
    if (loc === "en") {
      patchTable(id, { name: value });
      return;
    }
    const table = findTable(id);
    patchTable(id, { names: { ...(table?.names || {}), [loc]: value } });
  }

  function setSize(
    type: "table" | "shape",
    id: string,
    dimension: "w" | "h",
    value: number,
  ) {
    const geom = geomOf(type, id);
    if (!geom) return;
    const minSize = type === "table" ? MIN_TABLE : MIN_SHAPE;
    const rounded = Math.round(Number.isFinite(value) ? value : minSize);
    if (dimension === "w")
      updateEl(type, id, { w: clamp(rounded, minSize, FLOOR_W - geom.x) });
    else updateEl(type, id, { h: clamp(rounded, minSize, FLOOR_H - geom.y) });
  }
  function setRotationValue(type: "table" | "shape", id: string, value: number) {
    const rounded = Math.round(Number.isFinite(value) ? value : 0);
    updateEl(type, id, { rotation: ((rounded % 360) + 360) % 360 });
  }
  function setFont(type: "table" | "shape", id: string, value: number) {
    const rounded = clamp(
      Math.round(Number.isFinite(value) ? value : DEFAULT_TABLE_FONT),
      6,
      120,
    );
    updateEl(type, id, { fontSize: rounded });
  }

  function addShape(kind: PosShapeKind) {
    const size =
      kind === "wall"
        ? { w: 300, h: 25 }
        : kind === "circle" || kind === "door"
          ? { w: 100, h: 100 }
          : { w: 150, h: 100 };
    const shape: PosShape = {
      id: crypto.randomUUID(),
      area: "indoor",
      kind,
      x: snapToGrid((FLOOR_W - size.w) / 2),
      y: snapToGrid((FLOOR_H - size.h) / 2),
      ...size,
    };
    setDraftShapes((current) => [...current, shape]);
    setSelection([selKey("shape", shape.id)]);
  }

  function addTable(area: PosTableArea) {
    const count = draftTables.filter((table) => tableArea(table) === area).length;
    const table: PosTable = {
      id: crypto.randomUUID(),
      name: `${area === "outdoor" ? text.outdoorTable : text.indoorTable} ${count + 1}`,
      area,
      displayOrder: draftTables.length,
      isActive: true,
      ...defaultTablePosition(draftTables.length),
      shape: "rounded",
    };
    setDraftTables((current) => [...current, table]);
    setSelection([selKey("table", table.id)]);
  }

  function deleteSelection() {
    if (!selection.length) return;
    const keys = new Set(selection);
    const remainingTables = draftTables.filter(
      (table) => !keys.has(selKey("table", table.id)),
    );
    // Never delete the last remaining table.
    if (remainingTables.length >= 1) setDraftTables(remainingTables);
    setDraftShapes((current) =>
      current.filter((shape) => !keys.has(selKey("shape", shape.id))),
    );
    setSelection([]);
  }

  function copySelection() {
    const keys = new Set(selection);
    const tables = draftTables
      .filter((table) => keys.has(selKey("table", table.id)))
      .map((table) => ({
        ...table,
        names: table.names ? { ...table.names } : undefined,
      }));
    const shapes = draftShapes
      .filter((shape) => keys.has(selKey("shape", shape.id)))
      .map((shape) => ({ ...shape }));
    if (!tables.length && !shapes.length) return;
    clipboardRef.current = { tables, shapes };
    pasteOffsetRef.current = 0;
  }

  // Duplicate the copied elements with every attribute preserved (font, size,
  // shape, rotation, names…), a fresh id, and a small cascading offset.
  function pasteClipboard() {
    const clip = clipboardRef.current;
    if (!clip) return;
    pasteOffsetRef.current += 1;
    const offset = pasteOffsetRef.current * FLOOR_GRID * 2;
    const newKeys: string[] = [];
    const newTables = clip.tables.map((table) => {
      const id = crypto.randomUUID();
      newKeys.push(selKey("table", id));
      const w = table.w ?? DEFAULT_TABLE_W;
      const h = table.h ?? DEFAULT_TABLE_H;
      return {
        ...table,
        id,
        names: table.names ? { ...table.names } : undefined,
        x: clamp((table.x ?? 0) + offset, 0, FLOOR_W - w),
        y: clamp((table.y ?? 0) + offset, 0, FLOOR_H - h),
        displayOrder: draftTables.length,
      };
    });
    const newShapes = clip.shapes.map((shape) => {
      const id = crypto.randomUUID();
      newKeys.push(selKey("shape", id));
      return {
        ...shape,
        id,
        x: clamp(shape.x + offset, 0, FLOOR_W - shape.w),
        y: clamp(shape.y + offset, 0, FLOOR_H - shape.h),
      };
    });
    if (newTables.length) setDraftTables((current) => [...current, ...newTables]);
    if (newShapes.length) setDraftShapes((current) => [...current, ...newShapes]);
    setSelection(newKeys);
  }

  function tableStatus(table: PosTable) {
    const order = orders[table.id];
    const count = order?.lines.reduce((sum, line) => sum + line.quantity, 0) || 0;
    const occupied = count > 0;
    const total =
      occupied && order
        ? calculateTotals(order, currency, serviceFeeRate).total
        : 0;
    return { occupied, total };
  }

  function fontStyle(size: number | undefined, fallback: number): CSSProperties {
    return { fontSize: `${(((size ?? fallback) / FLOOR_W) * 100).toFixed(3)}cqw` };
  }
  function uprightStyle(rotation: number | undefined): CSSProperties | undefined {
    return rotation ? { transform: `rotate(${-rotation}deg)` } : undefined;
  }

  function tableBody(
    table: PosTable,
    status: { occupied: boolean; total: number },
  ) {
    return (
      <div
        className="flex flex-col items-center justify-center"
        style={uprightStyle(table.rotation)}>
        <span
          dir={textDir}
          className="block max-w-full truncate font-semibold leading-tight"
          style={fontStyle(table.fontSize, DEFAULT_TABLE_FONT)}>
          {tableLabel(table, locale)}
        </span>
        {status.occupied ? (
          <span className="mt-0.5 flex items-center gap-1">
            <SteamingCupIcon className="h-3.5 w-3.5" />
            <span
              dir={textDir}
              className="truncate font-bold tabular-nums"
              style={fontStyle(
                (table.fontSize ?? DEFAULT_TABLE_FONT) * 0.85,
                DEFAULT_TABLE_FONT * 0.85,
              )}>
              {formatMoney(status.total, currency, locale)}
            </span>
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {editing ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addTable("indoor")}>
            <Armchair className="h-4 w-4" aria-hidden />
            {text.indoor}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addTable("outdoor")}>
            <Umbrella className="h-4 w-4" aria-hidden />
            {text.outdoor}
          </Button>
          <span className="mx-1 h-5 w-px bg-border" aria-hidden />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addShape("rectangle")}>
            <RectangleHorizontal className="h-4 w-4" aria-hidden />
            {text.addRectangle}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addShape("circle")}>
            <Circle className="h-4 w-4" aria-hidden />
            {text.addCircle}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addShape("triangle")}>
            <Triangle className="h-4 w-4" aria-hidden />
            {text.addTriangle}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addShape("wall")}>
            <Minus className="h-4 w-4" aria-hidden />
            {text.addWall}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addShape("door")}>
            <DoorOpen className="h-4 w-4" aria-hidden />
            {text.addDoor}
          </Button>
          <span className="ms-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancelEdit}>
              {text.cancel}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onSave(draftTables, draftShapes)}>
              {text.saveLayout}
            </Button>
          </span>
        </div>
      ) : null}

      <div
        ref={boardRef}
        dir="ltr"
        tabIndex={editing ? 0 : undefined}
        onKeyDown={editing ? onBoardKeyDown : undefined}
        onPointerDown={editing ? () => setSelection([]) : undefined}
        className="floor-grid-bg floor-board relative w-full select-none overflow-hidden rounded-xl border bg-muted/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        style={{ aspectRatio: `${FLOOR_W} / ${FLOOR_H}` }}>
        {boardShapes.map((shape) => {
          const sel = editing && isSelected("shape", shape.id);
          return (
            <div
              key={shape.id}
              style={boxStyleFor(shape)}
              onPointerDown={
                editing
                  ? (event) => onElementPointerDown(event, "shape", shape.id)
                  : undefined
              }
              className={cn(
                "absolute z-10",
                editing && "cursor-move touch-none",
                sel && "z-20",
              )}>
              <ShapeView kind={shape.kind} />
              {shape.label ? (
                <span
                  className="pointer-events-none absolute inset-0 flex items-center justify-center px-1 text-center font-medium text-foreground/70"
                  style={{
                    ...fontStyle(shape.fontSize, DEFAULT_SHAPE_FONT),
                    ...uprightStyle(shape.rotation),
                  }}>
                  {shape.label}
                </span>
              ) : null}
              {sel && selection.length === 1 ? (
                <SelectionOverlay
                  onResize={(event, corner) =>
                    beginResize(event, "shape", shape.id, corner)
                  }
                  onRotate={(event) => beginRotate(event, "shape", shape.id)}
                />
              ) : sel ? (
                <span className="pointer-events-none absolute -inset-1 rounded-md ring-2 ring-primary" />
              ) : null}
            </div>
          );
        })}

        {boardTables.map((table) => {
          const status = tableStatus(table);
          const radius = tableShapeRadius(table.shape);
          if (editing) {
            const sel = isSelected("table", table.id);
            return (
              <div
                key={table.id}
                style={boxStyleFor(table)}
                onPointerDown={(event) =>
                  onElementPointerDown(event, "table", table.id)
                }
                className={cn(
                  "absolute z-10 flex cursor-move touch-none flex-col items-center justify-center overflow-hidden border p-1 text-center",
                  radius,
                  sel
                    ? "z-20 border-primary bg-primary/10 ring-2 ring-primary"
                    : "border-secondary/60 bg-card",
                )}>
                {tableBody(table, status)}
                {sel && selection.length === 1 ? (
                  <SelectionOverlay
                    onResize={(event, corner) =>
                      beginResize(event, "table", table.id, corner)
                    }
                    onRotate={(event) => beginRotate(event, "table", table.id)}
                  />
                ) : null}
              </div>
            );
          }
          const isSelectedTable = table.id === selectedTableId;
          const actionTarget = tableAction !== null && !isSelectedTable;
          const blockedTarget =
            actionTarget && tableAction === "move" && status.occupied;
          return (
            <button
              key={table.id}
              type="button"
              style={boxStyleFor(table)}
              onClick={() => onSelectTable(table.id)}
              className={cn(
                "focus-ring absolute z-10 flex flex-col items-center justify-center overflow-hidden border p-1 text-center transition-[transform,background-color,border-color,color] duration-200 active:scale-[0.97]",
                radius,
                tableStateClass({
                  selected: isSelectedTable,
                  occupied: status.occupied,
                  actionTarget,
                  blockedTarget,
                }),
              )}>
              {tableBody(table, status)}
            </button>
          );
        })}

        {guides.x.map((x, index) => (
          <span
            key={`gx-${index}`}
            className={cn(
              "pointer-events-none absolute bottom-0 top-0 z-40 w-px bg-pink-500 transition-opacity duration-200",
              guidesOn ? "opacity-100" : "opacity-0",
            )}
            style={{ left: `${(x / FLOOR_W) * 100}%` }}
          />
        ))}
        {guides.y.map((y, index) => (
          <span
            key={`gy-${index}`}
            className={cn(
              "pointer-events-none absolute left-0 right-0 z-40 h-px bg-pink-500 transition-opacity duration-200",
              guidesOn ? "opacity-100" : "opacity-0",
            )}
            style={{ top: `${(y / FLOOR_H) * 100}%` }}
          />
        ))}

        {!boardTables.length && !boardShapes.length ? (
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-muted-foreground">
            {editing ? text.floorPlanHint : text.noTablesInArea}
          </div>
        ) : null}
      </div>

      {editing ? (
        <div className="rounded-lg border bg-muted/20 p-3">
          {selection.length > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <span dir={textDir} className="text-sm text-muted-foreground">
                {selection.length} · {text.tables}
              </span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={deleteSelection}>
                <Trash2 className="h-4 w-4" aria-hidden />
                {text.deleteSelected}
              </Button>
            </div>
          ) : soleSelection?.type === "table" ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={text.nameEn}>
                  <Input
                    lang="en"
                    value={(soleSelection.el as PosTable).name}
                    onChange={(event) =>
                      setTableName("en", event.target.value, soleSelection.id)
                    }
                  />
                </Field>
                <Field label={text.nameCkb}>
                  <Input
                    lang="ckb"
                    value={(soleSelection.el as PosTable).names?.ckb || ""}
                    onChange={(event) =>
                      setTableName("ckb", event.target.value, soleSelection.id)
                    }
                  />
                </Field>
                <Field label={text.nameAr}>
                  <Input
                    lang="ar"
                    value={(soleSelection.el as PosTable).names?.ar || ""}
                    onChange={(event) =>
                      setTableName("ar", event.target.value, soleSelection.id)
                    }
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Field label={text.tableArea}>
                  <Select
                    value={tableArea(soleSelection.el as PosTable)}
                    onChange={(event) =>
                      patchTable(soleSelection.id, {
                        area: event.target.value as PosTableArea,
                      })
                    }>
                    <option value="indoor">{text.indoor}</option>
                    <option value="outdoor">{text.outdoor}</option>
                  </Select>
                </Field>
                <Field label={text.shape}>
                  <Select
                    value={(soleSelection.el as PosTable).shape || "rounded"}
                    onChange={(event) =>
                      patchTable(soleSelection.id, {
                        shape: event.target.value as PosTableShape,
                      })
                    }>
                    <option value="rounded">{text.shapeRounded}</option>
                    <option value="square">{text.shapeSquare}</option>
                    <option value="circle">{text.shapeCircle}</option>
                  </Select>
                </Field>
                <Field label={text.width}>
                  <PlanNumberField
                    value={(soleSelection.el as PosTable).w ?? DEFAULT_TABLE_W}
                    onCommit={(next) =>
                      setSize("table", soleSelection.id, "w", next)
                    }
                  />
                </Field>
                <Field label={text.height}>
                  <PlanNumberField
                    value={(soleSelection.el as PosTable).h ?? DEFAULT_TABLE_H}
                    onCommit={(next) =>
                      setSize("table", soleSelection.id, "h", next)
                    }
                  />
                </Field>
                <Field label={text.rotation}>
                  <PlanNumberField
                    value={(soleSelection.el as PosTable).rotation ?? 0}
                    onCommit={(next) =>
                      setRotationValue("table", soleSelection.id, next)
                    }
                  />
                </Field>
                <Field label={text.fontSize}>
                  <PlanNumberField
                    value={
                      (soleSelection.el as PosTable).fontSize ?? DEFAULT_TABLE_FONT
                    }
                    onCommit={(next) =>
                      setFont("table", soleSelection.id, next)
                    }
                  />
                </Field>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={deleteSelection}
                disabled={draftTables.length <= 1}>
                <Trash2 className="h-4 w-4" aria-hidden />
                {text.deleteSelected}
              </Button>
            </div>
          ) : soleSelection?.type === "shape" ? (
            <div className="space-y-3">
              <Field label={text.label}>
                <Input
                  value={(soleSelection.el as PosShape).label || ""}
                  placeholder={text.labelPlaceholder}
                  onChange={(event) =>
                    patchShape(soleSelection.id, { label: event.target.value })
                  }
                />
              </Field>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label={text.width}>
                  <PlanNumberField
                    value={(soleSelection.el as PosShape).w}
                    onCommit={(next) =>
                      setSize("shape", soleSelection.id, "w", next)
                    }
                  />
                </Field>
                <Field label={text.height}>
                  <PlanNumberField
                    value={(soleSelection.el as PosShape).h}
                    onCommit={(next) =>
                      setSize("shape", soleSelection.id, "h", next)
                    }
                  />
                </Field>
                <Field label={text.rotation}>
                  <PlanNumberField
                    value={(soleSelection.el as PosShape).rotation ?? 0}
                    onCommit={(next) =>
                      setRotationValue("shape", soleSelection.id, next)
                    }
                  />
                </Field>
                <Field label={text.fontSize}>
                  <PlanNumberField
                    value={
                      (soleSelection.el as PosShape).fontSize ?? DEFAULT_SHAPE_FONT
                    }
                    onCommit={(next) =>
                      setFont("shape", soleSelection.id, next)
                    }
                  />
                </Field>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={deleteSelection}>
                <Trash2 className="h-4 w-4" aria-hidden />
                {text.deleteSelected}
              </Button>
            </div>
          ) : (
            <p dir={textDir} className="text-sm text-muted-foreground">
              {text.selectToEdit}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function tableArea(table: PosTable): PosTableArea {
  return table.area === "outdoor" ? "outdoor" : "indoor";
}

function tableOrderLineCount(order: PosTableOrder | undefined) {
  return order?.lines.reduce((sum, line) => sum + line.quantity, 0) || 0;
}

function mergeOrderLines(
  baseLines: PosOrderLine[],
  addedLines: PosOrderLine[],
): PosOrderLine[] {
  const lines = baseLines.map((line) => ({ ...line }));
  for (const addedLine of addedLines) {
    const existing = lines.find(
      (line) =>
        line.itemId === addedLine.itemId &&
        line.unitPrice === addedLine.unitPrice &&
        (line.variantId || "") === (addedLine.variantId || "") &&
        (line.flavor || "").trim() === (addedLine.flavor || "").trim(),
    );
    if (existing) {
      existing.quantity += addedLine.quantity;
    } else {
      lines.push({ ...addedLine, id: crypto.randomUUID() });
    }
  }
  return lines;
}

// Square thumbnail for the menu picker. Real uploaded photos fill the tile
// (object-cover); items without an image fall back to the default cafe logo,
// matching the catalog cards. Plain <img> so animated GIFs still play.
const POS_THUMB_FALLBACK = "/site-icon.png";

function MenuPickerThumb({ src, alt }: { src?: string; alt: string }) {
  const [imageSrc, setImageSrc] = useState(src || POS_THUMB_FALLBACK);
  const isFallback = imageSrc === POS_THUMB_FALLBACK;

  useEffect(() => {
    setImageSrc(src || POS_THUMB_FALLBACK);
  }, [src]);

  return (
    <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-gradient-to-br from-accent via-primary/5 to-secondary/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={alt}
        loading="lazy"
        className={cn(
          "h-full w-full object-cover",
          isFallback && "scale-90 rounded-full p-1.5",
        )}
        onError={() => setImageSrc(POS_THUMB_FALLBACK)}
      />
    </span>
  );
}

// Coffee cup with big billowing vapor — used only on occupied tables. Color
// comes from `currentColor` (set by the parent's text-* class).
function SteamingCupIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
      focusable="false">
      <g
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none">
        <path
          className="pos-steam"
          style={{ animationDelay: "0s" }}
          d="M7.5 11.5c-2.1-2.3 2.1-3.9 0-6.6"
        />
        <path
          className="pos-steam"
          style={{ animationDelay: "0.5s" }}
          d="M12 11.5c-2.1-2.3 2.1-3.9 0-6.6"
        />
        <path
          className="pos-steam"
          style={{ animationDelay: "1s" }}
          d="M16.5 11.5c-2.1-2.3 2.1-3.9 0-6.6"
        />
      </g>
      <path
        d="M4.5 12.5h11v3a4.5 4.5 0 0 1-4.5 4.5H9a4.5 4.5 0 0 1-4.5-4.5z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M4.5 12.5h11v3a4.5 4.5 0 0 1-4.5 4.5H9a4.5 4.5 0 0 1-4.5-4.5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M15.5 13.5h1.8a2.5 2.5 0 0 1 0 5h-1.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function TotalRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 text-sm",
        strong && "border-t pt-3 text-lg font-bold",
      )}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ReceiptPreview({
  table,
  order,
  totals,
  locale,
  serviceFeePercent,
  restaurantName,
}: {
  table: PosTable;
  order: PosTableOrder;
  totals: PosTotals;
  locale: "en" | "ar" | "ckb";
  serviceFeePercent: number;
  restaurantName: string;
}) {
  const receiptLocale: "en" | "ckb" = locale === "ckb" ? "ckb" : "en";
  const issuedAt = formatReceiptDateTime(new Date());

  return (
    <div className="pos-print-area pos-receipt rounded-lg border bg-white p-5 font-mono text-black shadow-sm">
      <div className="text-center">
        <Image
          src="/stone-cafe-receipt-logo.png"
          alt={`${restaurantName} logo`}
          width={360}
          height={159}
          className="pos-receipt-logo mx-auto h-auto w-60 object-contain"
        />
        <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.14em]">
          {restaurantName}
        </h2>
      </div>

      <ReceiptRule />

      <div className="grid grid-cols-2 text-sm font-bold tabular-nums">
        <span>{issuedAt.date}</span>
        <span className="text-right">{issuedAt.time}</span>
      </div>
      <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-4 text-sm">
        <ReceiptLabel en="Table" ckb="مێز" />
        <span className="font-black">{table.name}</span>
      </div>

      <ReceiptRule />

      <div className="grid grid-cols-[1fr_auto] gap-4 text-base font-black">
        <ReceiptLabel en="Item" ckb="بڕگە" />
        <ReceiptLabel en="Rate" ckb="نرخ" align="end" />
      </div>

      <ReceiptRule />

      <div className="mt-2 space-y-2">
        {order.lines.map((line) => (
          <div
            key={line.id}
            className="grid grid-cols-[1fr_auto] gap-4 text-sm">
            <div className="min-w-0">
              <div className="flex flex-col items-start break-words font-bold leading-tight">
                <span dir="ltr">{line.name.en}</span>
                <span dir="rtl" className="text-[0.9em]">{line.name.ckb}</span>
              </div>
              {line.variantName ? (
                <div className="mt-0.5 flex flex-col items-start text-[11px] font-bold text-black">
                  <span dir="ltr">{line.variantName.en}</span>
                  <span dir="rtl">{line.variantName.ckb}</span>
                </div>
              ) : null}
              {line.flavor?.trim() ? <p className="mt-0.5 text-[10px] font-bold">Flavor / تام: {line.flavor.trim()}</p> : null}
              <p className="text-[11px] tabular-nums">
                {line.quantity} x{" "}
                {formatMoney(line.unitPrice, line.currency, receiptLocale)}
              </p>
            </div>
            <p className="font-black tabular-nums">
              {formatMoney(
                line.quantity * line.unitPrice,
                line.currency,
                receiptLocale,
              )}
            </p>
          </div>
        ))}
      </div>

      <ReceiptRule />

      <div className="space-y-2 text-sm">
        <ReceiptTotalRow
          en="Subtotal"
          ckb="کۆی لاوەکی"
          value={formatMoney(totals.subtotal, totals.currency, receiptLocale)}
        />
        {totals.discountAmount > 0 ? (
          <ReceiptTotalRow
            en="Discount"
            ckb="داشکاندن"
            value={`-${formatMoney(totals.discountAmount, totals.currency, receiptLocale)}`}
          />
        ) : null}
        {totals.serviceFeeAmount > 0 ? (
          <ReceiptTotalRow
            en={`Service fee ${serviceFeePercent}%`}
            ckb={`خزمەتگوزاری ${serviceFeePercent}%`}
            value={formatMoney(
              totals.serviceFeeAmount,
              totals.currency,
              receiptLocale,
            )}
          />
        ) : null}
        <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-4 border-t-2 border-dashed border-black pt-3">
          <ReceiptLabel
            en="Total"
            ckb="کۆی گشتی"
            className="text-base font-black"
          />
          <span className="text-2xl font-black tabular-nums">
            {formatMoney(totals.total, totals.currency, receiptLocale)}
          </span>
        </div>
      </div>

      <ReceiptRule />

      <div className="text-center">
        <p className="text-base font-black">Thank You and Visit Again</p>
        <p dir="rtl" className="mt-1 text-base font-black">
          سوپاس، جارێکی تر سەردانمان بکەنەوە
        </p>
        <p className="mt-3 text-xs font-bold">We&apos;d love your feedback</p>
        <p dir="rtl" className="text-xs font-bold">
          {" "}
          پێشنیاری خۆتان بکەن{" "}
        </p>
      </div>

      <p className="mt-4 text-center font-bold text-[9px] uppercase tracking-[0.15em] text-black">
        Powered by {BRAND_AGENCY}
      </p>
    </div>
  );
}

function ReceiptRule() {
  return (
    <div className="my-3 border-t-2 border-dashed border-black" aria-hidden />
  );
}

function ReceiptLabel({
  en,
  ckb,
  align = "start",
  className,
}: {
  en: string;
  ckb: string;
  align?: "start" | "end";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex flex-col leading-tight",
        align === "end" ? "items-end text-right" : "items-start text-left",
        className,
      )}>
      <span className="block">{en}</span>
      <span dir="rtl" className="block text-[0.78em] font-bold">
        {ckb}
      </span>
    </span>
  );
}

function ReceiptTotalRow({
  en,
  ckb,
  value,
}: {
  en: string;
  ckb: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-end gap-4">
      <ReceiptLabel en={en} ckb={ckb} />
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}

function formatReceiptDateTime(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours === 0 ? 12 : hours; // 0 -> 12 AM, 12 -> 12 PM

  return {
    date: `${day}-${month}-${year}`,
    time: `${hours}:${minutes} ${ampm}`,
  };
}

type PosTotals = {
  subtotal: number;
  discountAmount: number;
  serviceFeeAmount: number;
  total: number;
  currency: Currency;
};

function emptyOrder(tableId: string): PosTableOrder {
  return {
    tableId,
    lines: [],
    discountType: "percent",
    discountValue: 0,
  };
}

// A menu item's `flavor` field holds the available flavors as a
// comma/newline-separated list (e.g. "Vanilla, Caramel, Hazelnut"). POS turns
// that into selectable options for each order line.
function parseFlavorOptions(raw?: string): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  return raw
    .split(/[,،\n]/)
    .map((entry) => entry.trim())
    .filter((entry) => {
      if (!entry || seen.has(entry)) return false;
      seen.add(entry);
      return true;
    });
}

// Tap-to-open flavor selector for a POS order line: pick one of the item's
// preset flavors, clear it, or type a one-off custom flavor/note. Selecting an
// option replaces the current value and closes.
function FlavorPicker({
  open,
  title,
  options,
  value,
  dir,
  labels,
  onSelect,
  onClose,
}: {
  open: boolean;
  title: string;
  options: string[];
  value: string;
  dir: LocaleDirection;
  labels: {
    none: string;
    custom: string;
    save: string;
    cancel: string;
    placeholder: string;
  };
  onSelect: (flavor: string) => void;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState("");

  useEffect(() => {
    if (open) setCustom(value && !options.includes(value) ? value : "");
  }, [open, value, options]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const trimmedCustom = custom.trim();

  return (
    <div
      className="dialog-backdrop fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={onClose}
    >
      <div
        dir={dir}
        className="dialog-panel flex max-h-[85vh] w-full max-w-sm flex-col rounded-2xl border bg-card p-5 text-card-foreground shadow-2xl sm:p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-bold">{title}</h2>
        <div className="mt-4 min-h-0 flex-1 space-y-1.5 overflow-y-auto">
          <FlavorOption
            label={labels.none}
            active={value === ""}
            onClick={() => onSelect("")}
          />
          {options.map((option) => (
            <FlavorOption
              key={option}
              label={option}
              active={value === option}
              onClick={() => onSelect(option)}
            />
          ))}
        </div>
        <div className="mt-4 border-t pt-4">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            {labels.custom}
          </p>
          <div className="flex gap-2">
            <Input
              dir={dir}
              value={custom}
              placeholder={labels.placeholder}
              onChange={(event) => setCustom(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && trimmedCustom) {
                  event.preventDefault();
                  onSelect(trimmedCustom);
                }
              }}
            />
            <Button
              type="button"
              onClick={() => onSelect(trimmedCustom)}
              disabled={!trimmedCustom}
            >
              {labels.save}
            </Button>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            {labels.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FlavorOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
        active
          ? "border-primary bg-primary/10 font-semibold text-primary"
          : "hover:border-primary/40 hover:bg-muted",
      )}
    >
      <span className="min-w-0 truncate">{label}</span>
      {active ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
    </button>
  );
}

function calculateTotals(
  order: PosTableOrder,
  fallbackCurrency: Currency,
  serviceFeeRate: number = DEFAULT_SERVICE_FEE_RATE,
): PosTotals {
  const currency = order.lines[0]?.currency || fallbackCurrency;
  const subtotal = order.lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0,
  );
  const rawDiscount =
    order.discountType === "percent"
      ? Math.round((subtotal * Math.min(order.discountValue, 100)) / 100)
      : order.discountValue;
  const discountAmount = Math.min(subtotal, Math.max(0, rawDiscount));
  const serviceFeeAmount = Math.round(
    subtotal * Math.max(0, serviceFeeRate),
  );
  return {
    subtotal,
    discountAmount,
    serviceFeeAmount,
    // Snap the payable total to the nearest cash denomination (250 IQD).
    total: roundCashTotal(
      subtotal - discountAmount + serviceFeeAmount,
      currency,
    ),
    currency,
  };
}

function isWaterMenuItem(item: MenuItem, categories: AppData["categories"]): boolean {
  const category = categories.find((entry) => entry.id === item.categoryId);
  const searchable = [
    ...Object.values(item.name),
    ...item.tags,
    category?.slug || "",
    ...Object.values(category?.name || {}),
  ].map(normalizeSearch).join(" ");
  return /(^|\s)(water|waters|ماء|الماء|ئاو|ئاوی)(\s|$)/i.test(searchable);
}

function serviceFeeLabel(
  locale: "en" | "ar" | "ckb",
  percent: number = DEFAULT_SERVICE_FEE_PERCENT,
) {
  return locale === "ckb"
    ? `خزمەتگوزاری ${percent}%`
    : `Service fee ${percent}%`;
}

function normalizeTableOrder(state: PosState): PosState {
  return {
    ...state,
    tables: [...state.tables]
      .sort(
        (a, b) =>
          tableAreas.indexOf(tableArea(a)) - tableAreas.indexOf(tableArea(b)) ||
          a.displayOrder - b.displayOrder,
      )
      .map((table, index) => ({
        ...table,
        area: tableArea(table),
        displayOrder: index,
      })),
  };
}

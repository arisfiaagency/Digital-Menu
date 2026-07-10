"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useForm, type FieldPath, type UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { CheckCircle2, ChevronDown, CircleOff, GripVertical, ImageOff, ListOrdered, Pencil, PlusCircle, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUploadField } from "@/components/forms/image-upload-field";
import { adminErrorText, formatAdminText, useAdminLocale } from "@/components/admin/admin-preferences";
import { deleteMenuItem, getAdminAppData, reorderMenuItems, saveMenuItem, updateMenuItemAvailability } from "@/lib/firebase/firestore";
import { localized } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";
import { focusFirstInvalidField } from "@/lib/utils/focus-invalid-field";
import { formatMoney, normalizeSearch } from "@/lib/utils/format";
import { menuItemSchema } from "@/lib/validation/schemas";
import type { AppData, Currency, ImageHistoryEntry, Locale, MenuItem } from "@/types/models";

type MenuItemFormData = z.infer<typeof menuItemSchema>;

const emptyItem: MenuItemFormData = {
  id: "",
  categoryId: "",
  name: { en: "", ar: "", ckb: "" },
  description: { en: "", ar: "", ckb: "" },
  ingredients: { en: "", ar: "", ckb: "" },
  flavor: "",
  imageUrl: "",
  imagePath: "",
  imageHistory: [],
  basePrice: 0,
  discountPrice: undefined,
  currency: "IQD",
  preparationMinutes: undefined,
  calories: undefined,
  spicyLevel: 0,
  dietaryLabels: [],
  allergens: [],
  tags: [],
  variants: [],
  isAvailable: true,
  isSoldOut: false,
  isFeatured: false,
  isPopular: false,
  isNew: false,
  displayOrder: 0
};

export function MenuItemManager() {
  const { locale, text, dir: textDir } = useAdminLocale();
  const [data, setData] = useState<AppData | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [statusSavingIds, setStatusSavingIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [handledLinkedCategory, setHandledLinkedCategory] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [orderedItems, setOrderedItems] = useState<MenuItem[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const form = useForm<MenuItemFormData>({ resolver: zodResolver(menuItemSchema), defaultValues: emptyItem });

  async function refresh() {
    setData(await getAdminAppData());
  }

  const newItem = useCallback((categoryId = categoryFilter !== "all" ? categoryFilter : "") => {
    form.reset({
      ...emptyItem,
      categoryId,
      currency: data?.general.defaultCurrency || emptyItem.currency,
      displayOrder: nextDisplayOrder(data?.menuItems || [])
    });
    setMessage("");
    setError("");
    setImageUploading(false);
    setEditingItemId(null);
    setExpandedItemId(null);
    setFormOpen(true);
  }, [categoryFilter, data?.general.defaultCurrency, data?.menuItems, form]);

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!data || handledLinkedCategory) return;
    const linkedCategoryId = new URLSearchParams(window.location.search).get("category") || "";
    if (!linkedCategoryId || !data.categories.some((category) => category.id === linkedCategoryId)) {
      setHandledLinkedCategory(true);
      return;
    }
    setCategoryFilter(linkedCategoryId);
    newItem(linkedCategoryId);
    setHandledLinkedCategory(true);
  }, [data, handledLinkedCategory, newItem]);

  const items = useMemo(() => {
    const list = data?.menuItems || [];
    const normalizedQuery = normalizeSearch(query);
    return list
      .filter((item) => categoryFilter === "all" || item.categoryId === categoryFilter)
      .filter((item) => {
        if (availabilityFilter === "available") return item.isAvailable && !item.isSoldOut;
        if (availabilityFilter === "sold-out") return item.isSoldOut;
        if (availabilityFilter === "missing-translations") return !item.name.en || !item.name.ar || !item.name.ckb;
        return true;
      })
      .filter((item) => {
        if (!normalizedQuery) return true;
        const categoryName = data?.categories.find((category) => category.id === item.categoryId)?.name;
        return normalizeSearch([
          ...Object.values(item.name),
          ...Object.values(item.description || {}),
          ...Object.values(item.ingredients || {}),
          localized(categoryName, locale, "")
        ].join(" ")).includes(normalizedQuery);
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [availabilityFilter, categoryFilter, data, locale, query]);

  async function onSubmit(values: MenuItemFormData) {
    const name = localized(values.name, locale, values.name.en || text.menuItem);
    if (imageUploading) {
      setError(text.imageUploadInProgress);
      return;
    }
    setSaving(true);
    setError("");
    setMessage(formatAdminText(text.savingItem, { name }));
    const id = values.id || crypto.randomUUID();
    const item = {
      ...values,
      id,
      // Available and sold-out are opposites — a sold-out item can never be available.
      isAvailable: values.isSoldOut ? false : values.isAvailable
    } as MenuItem;
    try {
      await saveMenuItem(item);
      setData((current) => upsertMenuItem(current, item));
      form.reset(emptyItem);
      setFormOpen(false);
      setEditingItemId(null);
      setExpandedItemId(id);
      setMessage(formatAdminText(text.menuItemSavedNamed, { name }));
    } catch (err) {
      setError(err instanceof Error ? err.message : text.menuItemSaved);
      setMessage("");
    } finally {
      setSaving(false);
    }
  }

  function edit(item: MenuItem) {
    setFormOpen(false);
    setExpandedItemId(item.id);
    setEditingItemId(item.id);
    setMessage("");
    setError("");
    setImageUploading(false);
    form.reset({
      ...item,
      description: {
        en: item.description.en || "",
        ar: item.description.ar || "",
        ckb: item.description.ckb || ""
      },
      ingredients: {
        en: item.ingredients?.en || "",
        ar: item.ingredients?.ar || "",
        ckb: item.ingredients?.ckb || ""
      },
      imageUrl: item.imageUrl || "",
      imagePath: item.imagePath || "",
      imageHistory: activeImageHistory(item.imageHistory)
    });
  }

  function cancelEdit() {
    setEditingItemId(null);
    setImageUploading(false);
    form.reset(emptyItem);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await deleteMenuItem(deleteTarget.id);
      setDeleteTarget(null);
      await refresh();
      setMessage(text.menuItemDeleted);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.settingsSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function toggleItemAvailable(item: MenuItem, isAvailable: boolean) {
    // Available and sold-out are opposites: turning an item available also clears its sold-out flag.
    const clearSoldOut = isAvailable && item.isSoldOut;
    const nextItem = { ...item, isAvailable, isSoldOut: isAvailable ? false : item.isSoldOut };
    const name = localized(item.name, locale, item.name.en);

    setStatusSavingIds((current) => (current.includes(item.id) ? current : [...current, item.id]));
    setMessage("");
    setError("");
    setData((current) => upsertMenuItem(current, nextItem));

    try {
      await updateMenuItemAvailability(item.id, isAvailable, clearSoldOut ? false : undefined);
      setMessage(`${name}: ${isAvailable ? text.available : text.inactive}`);
    } catch (err) {
      setData((current) => upsertMenuItem(current, item));
      setError(err instanceof Error ? err.message : text.menuItemSaved);
    } finally {
      setStatusSavingIds((current) => current.filter((id) => id !== item.id));
    }
  }

  function startReorder() {
    setOrderedItems(items);
    setReorderMode(true);
    setDraggingId(null);
    setFormOpen(false);
    setEditingItemId(null);
    setExpandedItemId(null);
    setMessage("");
    setError("");
  }

  function cancelReorder() {
    setReorderMode(false);
    setDraggingId(null);
    setOrderedItems([]);
  }

  function handleReorderPointerDown(event: ReactPointerEvent, id: string) {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDraggingId(id);
  }

  function handleReorderPointerMove(event: ReactPointerEvent) {
    if (!draggingId) return;
    const pointerY = event.clientY;
    setOrderedItems((current) => {
      const index = current.findIndex((entry) => entry.id === draggingId);
      if (index === -1) return current;
      // Swap with the neighbour whose midpoint the pointer has crossed (one step per move — stable).
      if (index > 0) {
        const prev = rowRefs.current.get(current[index - 1].id);
        if (prev) {
          const rect = prev.getBoundingClientRect();
          if (pointerY < rect.top + rect.height / 2) {
            const next = [...current];
            [next[index - 1], next[index]] = [next[index], next[index - 1]];
            return next;
          }
        }
      }
      if (index < current.length - 1) {
        const following = rowRefs.current.get(current[index + 1].id);
        if (following) {
          const rect = following.getBoundingClientRect();
          if (pointerY > rect.top + rect.height / 2) {
            const next = [...current];
            [next[index + 1], next[index]] = [next[index], next[index + 1]];
            return next;
          }
        }
      }
      return current;
    });
  }

  function handleReorderPointerUp() {
    setDraggingId(null);
  }

  async function saveOrder() {
    // Reuse the same set of displayOrder "slots" the reordered items already occupied, sorted
    // ascending, and hand them out in the new visual order. Items outside this view keep their slots.
    // If those slots aren't all distinct (e.g. un-migrated data all at 0) they can't express an
    // order, so fall back to fresh sequential numbers.
    const slots = orderedItems.map((entry) => entry.displayOrder).sort((a, b) => a - b);
    const targetOrders = new Set(slots).size === slots.length ? slots : orderedItems.map((_, index) => index);
    const updates = orderedItems
      .map((entry, index) => ({ id: entry.id, displayOrder: targetOrders[index] }))
      .filter((entry, index) => entry.displayOrder !== orderedItems[index].displayOrder);

    if (!updates.length) {
      cancelReorder();
      return;
    }

    setSavingOrder(true);
    setMessage("");
    setError("");
    try {
      await reorderMenuItems(updates);
      setData((current) => {
        if (!current) return current;
        const orderById = new Map(updates.map((entry) => [entry.id, entry.displayOrder]));
        return {
          ...current,
          menuItems: current.menuItems.map((entry) =>
            orderById.has(entry.id) ? { ...entry, displayOrder: orderById.get(entry.id) as number } : entry
          )
        };
      });
      cancelReorder();
      setMessage(text.orderSaved);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.settingsSaveFailed);
    } finally {
      setSavingOrder(false);
    }
  }

  const allItems = data?.menuItems || [];
  const availableItems = allItems.filter((item) => item.isAvailable && !item.isSoldOut).length;
  const soldOutItems = allItems.filter((item) => item.isSoldOut).length;
  const missingImages = allItems.filter((item) => !item.imageUrl).length;
  const missingTranslations = allItems.filter((item) => missingLocalizedFields(item.name)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{text.menuItems}</h1>
          <p className="text-muted-foreground">{text.menuItemDescription}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {reorderMode ? (
            <>
              <Button type="button" onClick={saveOrder} disabled={savingOrder}>
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                {savingOrder ? text.saving : text.saveOrder}
              </Button>
              <Button type="button" variant="outline" onClick={cancelReorder} disabled={savingOrder}>
                <X className="h-4 w-4" aria-hidden />
                {text.cancel}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={startReorder} disabled={!data || items.length < 2}>
                <ListOrdered className="h-4 w-4" aria-hidden />
                {text.reorderItems}
              </Button>
              <Button type="button" onClick={() => newItem()}>
                <PlusCircle className="h-4 w-4" aria-hidden />
                {text.addNewMenuItem}
              </Button>
            </>
          )}
        </div>
      </div>

      {message ? <p className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm text-primary">{message}</p> : null}
      {error ? <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CatalogStat label={text.totalMenuItems} value={allItems.length} />
        <CatalogStat label={text.availableItems} value={availableItems} tone="primary" />
        <CatalogStat label={text.soldOutItems} value={soldOutItems} />
        <CatalogStat label={text.needsAttention} value={missingImages + missingTranslations} />
      </div>

      {reorderMode ? (
        <Card className="settings-panel">
          <CardHeader>
            <CardTitle>{text.reorderItems}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{text.reorderHint}</p>
            <ul className="grid gap-2">
              {orderedItems.map((item) => {
                const category = data?.categories.find((entry) => entry.id === item.categoryId);
                const categoryName = localized(category?.name, locale, text.noCategory);
                return (
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
                      aria-label={text.reorderItems}
                      className="focus-ring touch-none cursor-grab rounded-md p-1 text-muted-foreground active:cursor-grabbing"
                      onPointerDown={(event) => handleReorderPointerDown(event, item.id)}
                      onPointerMove={handleReorderPointerMove}
                      onPointerUp={handleReorderPointerUp}
                      onPointerCancel={handleReorderPointerUp}
                    >
                      <GripVertical className="h-5 w-5" aria-hidden />
                    </button>
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ImageOff className="h-4 w-4" aria-hidden />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{localized(item.name, locale, item.name.en)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {categoryName} · {formatMoney(item.basePrice, item.currency, locale)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : (
      <>
      {formOpen ? (
        <Card className="settings-panel">
          <CardHeader>
            <CardTitle>{text.menuItem}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <MenuItemEditorForm
              form={form}
              data={data}
              locale={locale}
              text={text}
              saving={saving}
              imageUploading={imageUploading}
              onUploadingChange={setImageUploading}
              onSubmit={onSubmit}
              onCancel={() => setFormOpen(false)}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder={text.searchItems} value={query} onChange={(event) => setQuery(event.target.value)} />
          <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="all">{text.allCategories}</option>
            {(data?.categories || []).map((category) => (
              <option key={category.id} value={category.id}>{localized(category.name, locale, category.name.en)}</option>
            ))}
          </Select>
          <Select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}>
            <option value="all">{text.allStatuses}</option>
            <option value="available">{text.available}</option>
            <option value="sold-out">{text.soldOut}</option>
            <option value="missing-translations">{text.missingTranslations}</option>
          </Select>
        </div>
        <div className="grid gap-3">
          {!data ? (
            Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-[68px] w-full rounded-xl" />)
          ) : items.length ? items.map((item) => {
            const category = data?.categories.find((entry) => entry.id === item.categoryId);
            const categoryName = localized(category?.name, locale, text.noCategory);
            const expanded = expandedItemId === item.id;
            const statusSaving = statusSavingIds.includes(item.id);
            const missingTranslationCount = missingLocalizedFields(item.name);
            const unavailable = !item.isAvailable || item.isSoldOut;
            return (
              <Card key={item.id} className={cn(unavailable && "bg-muted/20")}>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg p-4 transition-colors hover:bg-muted/50 sm:p-5">
                  <button
                    type="button"
                    className="focus-ring flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md text-start"
                    aria-expanded={expanded}
                    onClick={() => setExpandedItemId((current) => (current === item.id ? null : item.id))}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <ImageOff className="h-5 w-5" aria-hidden />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{localized(item.name, locale, item.name.en)}</p>
                          <Badge className={cn(item.isAvailable && !item.isSoldOut ? "border-primary/30 bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                            {item.isSoldOut ? text.soldOut : item.isAvailable ? text.available : text.inactive}
                          </Badge>
                          {item.isFeatured ? <Badge>{text.featured}</Badge> : null}
                          {item.isPopular ? <Badge>{text.popular}</Badge> : null}
                          {item.isNew ? <Badge>{text.isNew}</Badge> : null}
                          {missingTranslationCount ? (
                            <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                              {text.missingTranslations}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          <span lang="en">{item.name.en}</span> / <span lang="ar">{item.name.ar}</span> / <span lang="ckb">{item.name.ckb}</span>
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full border bg-background px-2 py-0.5">{categoryName}</span>
                          <span className="rounded-full border bg-background px-2 py-0.5">{formatMoney(item.basePrice, item.currency, locale)}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} aria-hidden />
                  </button>
                  <div className="flex shrink-0 items-center gap-2 rounded-md border bg-background px-3 py-2">
                    <span className={cn("text-xs font-semibold", item.isAvailable ? "text-primary" : "text-muted-foreground")}>
                      {item.isAvailable ? text.available : text.inactive}
                    </span>
                    <Switch
                      label={`${text.available}: ${localized(item.name, locale, item.name.en)}`}
                      checked={item.isAvailable}
                      disabled={statusSaving}
                      onCheckedChange={(checked) => toggleItemAvailable(item, checked)}
                    />
                  </div>
                </div>
                {expanded ? (
                  <CardContent className="settings-panel border-t pt-5">
                    {editingItemId === item.id ? (
                      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <MenuItemEditorForm
                          form={form}
                          data={data}
                          locale={locale}
                          text={text}
                          saving={saving}
                          imageUploading={imageUploading}
                          onUploadingChange={setImageUploading}
                          onSubmit={onSubmit}
                          onCancel={cancelEdit}
                        />
                      </div>
                    ) : (
                      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
                        <MenuItemAdminPreview item={item} locale={locale} text={text} />
                        <div className="flex flex-wrap content-start gap-2">
                          <Button type="button" variant="outline" size="icon" aria-label={text.edit} title={text.edit} onClick={() => edit(item)}>
                            <Pencil className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button type="button" variant="destructive" size="icon" aria-label={text.delete} title={text.delete} onClick={() => setDeleteTarget(item)}>
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                ) : null}
              </Card>
            );
          }) : (
            <EmptyCatalogState
              title={query || categoryFilter !== "all" || availabilityFilter !== "all" ? text.noMatchingItems : text.noMenuItemsYet}
              actionLabel={text.addNewMenuItem}
              onAction={() => newItem()}
            />
          )}
        </div>
      </div>
      </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        dir={textDir}
        variant="destructive"
        icon={<Trash2 className="h-5 w-5" aria-hidden />}
        title={text.deleteItem}
        description={
          deleteTarget
            ? formatAdminText(text.deleteItemConfirm, { name: localized(deleteTarget.name, locale, deleteTarget.name.en) })
            : ""
        }
        confirmLabel={text.delete}
        cancelLabel={text.cancel}
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

// Tapping/clicking a name field selects all its text so typing replaces it (or you can copy it).
// Clicking a field the browser then places a caret, which would clear the selection — so if this is
// the click that focuses the field, we take focus over ourselves and let onFocus do the select().
function selectAllOnFocus(event: React.FocusEvent<HTMLInputElement>) {
  event.currentTarget.select();
}

function selectAllOnMouseDown(event: React.MouseEvent<HTMLInputElement>) {
  if (document.activeElement !== event.currentTarget) {
    event.preventDefault();
    event.currentTarget.focus();
  }
}

// Used for price fields: clicking/tapping fades the current value to a 50%-opacity ghost and clears
// the field so you can type a fresh number (typing replaces it). Tab/click away without typing
// anything and the original value comes back.
function FadeOnFocusInput({
  form,
  name,
  className,
  ...props
}: {
  form: UseFormReturn<MenuItemFormData>;
  name: FieldPath<MenuItemFormData>;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "form" | "value" | "onChange" | "name">) {
  const raw = form.watch(name);
  const committed = raw === undefined || raw === null ? "" : String(raw);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const originalRef = useRef("");
  const showGhost = editing && draft === "" && originalRef.current !== "";

  return (
    <Input
      {...props}
      name={name}
      value={editing ? draft : committed}
      placeholder={showGhost ? originalRef.current : props.placeholder}
      className={cn(showGhost && "placeholder:text-foreground/50", className)}
      onFocus={(event) => {
        originalRef.current = committed;
        setDraft("");
        setEditing(true);
        props.onFocus?.(event);
      }}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        form.setValue(name, next as unknown as never, { shouldDirty: true });
      }}
      onBlur={(event) => {
        setEditing(false);
        if (draft === "") {
          const current = form.getValues(name);
          const currentStr = current === undefined || current === null ? "" : String(current);
          if (currentStr !== originalRef.current) {
            form.setValue(name, originalRef.current as unknown as never, { shouldDirty: true });
          }
        }
        props.onBlur?.(event);
      }}
    />
  );
}

function MenuItemEditorForm({
  form,
  data,
  locale,
  text,
  saving,
  imageUploading,
  onUploadingChange,
  onSubmit,
  onCancel
}: {
  form: UseFormReturn<MenuItemFormData>;
  data: AppData | null;
  locale: Locale;
  text: Record<string, string>;
  saving: boolean;
  imageUploading: boolean;
  onUploadingChange: (uploading: boolean) => void;
  onSubmit: (values: MenuItemFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const watchedItem = form.watch();
  const variants = form.watch("variants") || [];
  const categoryId = form.watch("categoryId");
  const defaultCurrency = data?.general.defaultCurrency || emptyItem.currency;

  function addVariant() {
    form.setValue("variants", [
      ...variants,
      {
        id: crypto.randomUUID(),
        name: { en: "Regular", ar: "عادي", ckb: "ئاسایی" },
        price: form.getValues("basePrice"),
        isAvailable: true,
        displayOrder: variants.length + 1
      }
    ], { shouldDirty: true });
  }

  return (
    <>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit, focusFirstInvalidField)}>
        <FormSection title={text.basics}>
          <Field label={text.category} error={adminErrorText(form.formState.errors.categoryId?.message, text)}>
            <Select {...form.register("categoryId")}>
              <option value="">{text.chooseCategory}</option>
              {(data?.categories || []).map((category) => (
                <option key={category.id} value={category.id}>{localized(category.name, locale, category.name.en)}</option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={text.englishName} error={adminErrorText(form.formState.errors.name?.en?.message, text)}><Input lang="en" onFocus={selectAllOnFocus} onMouseDown={selectAllOnMouseDown} {...form.register("name.en")} /></Field>
            <Field label={text.arabicName} error={adminErrorText(form.formState.errors.name?.ar?.message, text)}><Input dir="rtl" lang="ar" onFocus={selectAllOnFocus} onMouseDown={selectAllOnMouseDown} {...form.register("name.ar")} /></Field>
            <Field label={text.kurdishName} error={adminErrorText(form.formState.errors.name?.ckb?.message, text)}><Input dir="rtl" lang="ckb" onFocus={selectAllOnFocus} onMouseDown={selectAllOnMouseDown} {...form.register("name.ckb")} /></Field>
          </div>
        </FormSection>
        <FormSection title={text.descriptions}>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={text.englishDescription}><Textarea lang="en" {...form.register("description.en")} /></Field>
            <Field label={text.arabicDescription}><Textarea dir="rtl" lang="ar" {...form.register("description.ar")} /></Field>
            <Field label={text.kurdishDescription}><Textarea dir="rtl" lang="ckb" {...form.register("description.ckb")} /></Field>
          </div>
        </FormSection>
        <FormSection title={text.ingredients}>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={text.englishIngredients}><Input lang="en" {...form.register("ingredients.en")} /></Field>
            <Field label={text.arabicIngredients}><Input dir="rtl" lang="ar" {...form.register("ingredients.ar")} /></Field>
            <Field label={text.kurdishIngredients}><Input dir="rtl" lang="ckb" {...form.register("ingredients.ckb")} /></Field>
          </div>
        </FormSection>
        <FormSection title={text.flavor}>
          <Field label={text.flavor}><Input {...form.register("flavor")} placeholder={text.flavorListPlaceholder} /></Field>
          <p className="mt-2 text-xs text-muted-foreground">{text.flavorListHint}</p>
        </FormSection>
        <FormSection title={text.pricing}>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={text.basePrice}><FadeOnFocusInput form={form} name="basePrice" type="number" /></Field>
            <Field label={text.discountPrice}><FadeOnFocusInput form={form} name="discountPrice" type="number" /></Field>
            <Field label={text.currency}>
              <Select
                value={form.watch("currency") || defaultCurrency}
                onChange={(event) => form.setValue("currency", event.target.value as Currency, { shouldDirty: true })}
              >
                <option value="IQD">IQD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="TRY">TRY</option>
              </Select>
            </Field>
          </div>
        </FormSection>
        <FormSection title={text.status}>
          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleRow
              text={text.available}
              checked={Boolean(form.watch("isAvailable"))}
              onCheckedChange={(checked) => {
                form.setValue("isAvailable", checked, { shouldDirty: true });
                if (checked) form.setValue("isSoldOut", false, { shouldDirty: true });
              }}
            />
            <ToggleRow
              text={text.soldOut}
              checked={Boolean(form.watch("isSoldOut"))}
              onCheckedChange={(checked) => {
                form.setValue("isSoldOut", checked, { shouldDirty: true });
                if (checked) form.setValue("isAvailable", false, { shouldDirty: true });
              }}
            />
            <ToggleRow text={text.featured} checked={Boolean(form.watch("isFeatured"))} onCheckedChange={(checked) => form.setValue("isFeatured", checked, { shouldDirty: true })} />
            <ToggleRow text={text.popular} checked={Boolean(form.watch("isPopular"))} onCheckedChange={(checked) => form.setValue("isPopular", checked, { shouldDirty: true })} />
            <ToggleRow text={text.isNew} checked={Boolean(form.watch("isNew"))} onCheckedChange={(checked) => form.setValue("isNew", checked, { shouldDirty: true })} />
          </div>
        </FormSection>
        <FormSection title={text.media}>
          <ImageUploadField
            label={text.itemImage}
            text={text}
            path={`menu-items/${form.watch("id") || categoryId || "new"}`}
            imageUrl={form.watch("imageUrl") || ""}
            imageHistory={form.watch("imageHistory") || []}
            helpText={text.menuItemImageHint}
            onUploaded={(result) => {
              form.setValue("imageHistory", addCurrentImageToHistory(form.getValues()), { shouldDirty: true });
              form.setValue("imageUrl", result.imageUrl, { shouldDirty: true, shouldValidate: true });
              form.setValue("imagePath", result.imagePath, { shouldDirty: true });
            }}
            onRemoved={() => {
              form.setValue("imageHistory", addCurrentImageToHistory(form.getValues()), { shouldDirty: true });
              form.setValue("imageUrl", "", { shouldDirty: true, shouldValidate: true });
              form.setValue("imagePath", "", { shouldDirty: true });
            }}
            onRollback={(entry) => {
              const values = form.getValues();
              const history = addCurrentImageToHistory({
                imageUrl: values.imageUrl,
                imagePath: values.imagePath,
                imageHistory: (values.imageHistory || []).filter((item) => item.id !== entry.id)
              });
              form.setValue("imageUrl", entry.imageUrl, { shouldDirty: true, shouldValidate: true });
              form.setValue("imagePath", entry.imagePath, { shouldDirty: true });
              form.setValue("imageHistory", history, { shouldDirty: true });
            }}
            onUploadingChange={onUploadingChange}
          />
        </FormSection>
        <FormSection title={text.variants}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">{text.variants}</h3>
            <Button type="button" variant="outline" size="sm" onClick={addVariant}>{text.addVariant}</Button>
          </div>
          {variants.length ? variants.map((variant, index) => (
            <div key={variant.id} className="grid gap-2 rounded-md border bg-background p-3 lg:grid-cols-[1fr_1fr_1fr_120px_110px_44px]">
              <Input lang="en" {...form.register(`variants.${index}.name.en`)} placeholder={text.english} />
              <Input dir="rtl" lang="ar" {...form.register(`variants.${index}.name.ar`)} placeholder={text.arabic} />
              <Input dir="rtl" lang="ckb" {...form.register(`variants.${index}.name.ckb`)} placeholder={text.kurdish} />
              <FadeOnFocusInput form={form} name={`variants.${index}.price`} type="number" placeholder={text.price} />
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-xs font-medium">{text.available}</span>
                <Switch
                  label={`${text.available}: ${localized(variant.name, locale, variant.name.en)}`}
                  checked={Boolean(form.watch(`variants.${index}.isAvailable`))}
                  onCheckedChange={(checked) => form.setValue(`variants.${index}.isAvailable`, checked, { shouldDirty: true })}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={text.remove}
                title={text.remove}
                onClick={() => form.setValue("variants", (form.getValues("variants") || []).filter((_, entryIndex) => entryIndex !== index), { shouldDirty: true })}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          )) : (
            <p className="rounded-md border border-dashed bg-background p-3 text-sm text-muted-foreground">{text.noVariants}</p>
          )}
        </FormSection>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving || imageUploading}>{saving ? text.saving : text.saveItem}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>{text.cancel}</Button>
        </div>
      </form>
      <MenuItemAdminPreview
        item={watchedItem}
        locale={locale}
        text={text}
      />
    </>
  );
}

function MenuItemAdminPreview({
  item,
  locale,
  text
}: {
  item: MenuItemFormData | MenuItem;
  locale: Locale;
  text: Record<string, string>;
}) {
  const title = localized(item.name, locale, item.name.en || text.menuItem);
  const description = localized(item.description, locale);
  const hasDiscount = typeof item.discountPrice === "number" && item.discountPrice > 0;

  return (
    <div className="rounded-lg border bg-muted/25 p-3">
      <p className="mb-3 text-sm font-medium">{text.preview}</p>
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="relative aspect-[5/4] bg-gradient-to-br from-accent via-primary/10 to-secondary/10">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-lg font-semibold text-primary/70">
              {title}
            </div>
          )}
          {item.isSoldOut ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/65 backdrop-blur-[2px]">
              <span className="rounded-full border border-destructive bg-background/90 px-4 py-1.5 text-sm font-semibold text-destructive">
                {text.soldOut}
              </span>
            </div>
          ) : null}
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold leading-tight">{title}</h3>
            </div>
            <div className="shrink-0 text-end">
              {hasDiscount ? (
                <>
                  <p className="text-xs text-muted-foreground line-through">{formatMoney(item.basePrice, item.currency, locale)}</p>
                  <p className="text-sm font-bold text-secondary">{formatMoney(item.discountPrice as number, item.currency, locale)}</p>
                </>
              ) : (
                <p className="text-sm font-bold text-primary">{formatMoney(item.basePrice, item.currency, locale)}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className={cn(item.isAvailable && !item.isSoldOut ? "border-primary/30 bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              {item.isSoldOut ? text.soldOut : item.isAvailable ? text.available : text.inactive}
            </Badge>
            {item.isFeatured ? <Badge>{text.featured}</Badge> : null}
            {item.isPopular ? <Badge>{text.popular}</Badge> : null}
            {item.isNew ? <Badge>{text.isNew}</Badge> : null}
          </div>
          {description ? <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p> : null}
          {item.variants?.length ? (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {item.variants.map((variant) => (
                <span key={variant.id} className="rounded-full border bg-background px-2.5 py-1">
                  {localized(variant.name, locale, variant.name.en)} · {formatMoney(variant.price, item.currency, locale)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function CatalogStat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "primary" }) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", tone === "primary" && "border-primary/30 bg-primary/5")}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border bg-muted/15 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function ToggleRow({ text, checked, onCheckedChange }: { text: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-background p-3">
      <span className="text-sm font-medium">{text}</span>
      <Switch label={text} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function EmptyCatalogState({ title, actionLabel, onAction }: { title: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/15 p-8 text-center">
      <CircleOff className="h-8 w-8 text-muted-foreground" aria-hidden />
      <p className="mt-3 font-medium">{title}</p>
      <Button type="button" className="mt-4" onClick={onAction}>
        <PlusCircle className="h-4 w-4" aria-hidden />
        {actionLabel}
      </Button>
    </div>
  );
}

function missingLocalizedFields(value: Record<Locale, string> | Partial<Record<Locale, string>>) {
  return (["en", "ar", "ckb"] as Locale[]).filter((key) => !value[key]).length;
}

function nextDisplayOrder(entries: { displayOrder: number }[]) {
  return entries.length ? Math.max(...entries.map((entry) => entry.displayOrder)) + 1 : 1;
}

function addCurrentImageToHistory({
  imageUrl,
  imagePath,
  imageHistory = []
}: {
  imageUrl?: string;
  imagePath?: string;
  imageHistory?: ImageHistoryEntry[];
}) {
  const active = activeImageHistory(imageHistory);
  if (!imageUrl || !imagePath) return active;
  const createdAt = new Date();
  const previous: ImageHistoryEntry = {
    id: crypto.randomUUID(),
    imageUrl,
    imagePath,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
  };
  return [previous, ...active.filter((entry) => entry.imagePath !== imagePath && entry.imageUrl !== imageUrl)];
}

function activeImageHistory(history: ImageHistoryEntry[] = []) {
  const now = Date.now();
  return history.filter((entry) => Number.isFinite(Date.parse(entry.expiresAt)) && Date.parse(entry.expiresAt) > now);
}

function upsertMenuItem(data: AppData | null, item: MenuItem): AppData | null {
  if (!data) return data;
  const exists = data.menuItems.some((entry) => entry.id === item.id);
  return {
    ...data,
    menuItems: exists
      ? data.menuItems.map((entry) => (entry.id === item.id ? item : entry))
      : [...data.menuItems, item]
  };
}

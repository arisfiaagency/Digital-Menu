"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import Link from "next/link";
import { CheckCircle2, ChevronDown, CircleOff, ListOrdered, Pencil, PlusCircle, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { adminErrorText, formatAdminText, useAdminLocale } from "@/components/admin/admin-preferences";
import { CATEGORY_ICONS, CategoryIcon, DEFAULT_CATEGORY_ICON } from "@/components/menu/category-icon";
import { ReorderList } from "@/components/admin/reorder-list";
import { useTenant } from "@/components/tenant-provider";
import { getAdminAppData, deleteCategory, deleteCategoryKeepItems, deleteCategoryWithItems, reorderCategories, saveCategory, updateCategoryActive } from "@/lib/firebase/firestore";
import { localized } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";
import { focusFirstInvalidField } from "@/lib/utils/focus-invalid-field";
import { normalizeSearch, slugify } from "@/lib/utils/format";
import { categorySchema } from "@/lib/validation/schemas";
import type { AppData, Category, Locale } from "@/types/models";

type CategoryFormData = z.infer<typeof categorySchema>;

const emptyCategory: CategoryFormData = {
  id: "",
  name: { en: "", ar: "", ckb: "" },
  description: { en: "", ar: "", ckb: "" },
  slug: "",
  icon: "",
  displayOrder: 0,
  isActive: true
};

export function CategoryManager() {
  const { locale, text, dir } = useAdminLocale();
  const { adminBasePath } = useTenant();
  const [data, setData] = useState<AppData | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [statusSavingIds, setStatusSavingIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  // Destination for "keep items": a category id, or "" = keep uncategorized (Others).
  const [moveTarget, setMoveTarget] = useState("");
  const [deleteMode, setDeleteMode] = useState<"keep" | "delete">("keep");
  const [reorderMode, setReorderMode] = useState(false);
  const [orderedCategories, setOrderedCategories] = useState<Category[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const form = useForm<CategoryFormData>({ resolver: zodResolver(categorySchema), defaultValues: emptyCategory });

  async function refresh() {
    setData(await getAdminAppData());
  }

  useEffect(() => {
    refresh();
  }, []);

  const categories = useMemo(() => {
    const list = data?.categories || [];
    const normalizedQuery = normalizeSearch(query);
    return list
      .filter((entry) => statusFilter === "all" || (statusFilter === "active" ? entry.isActive : !entry.isActive))
      .filter((entry) => !normalizedQuery || normalizeSearch(Object.values(entry.name).join(" ")).includes(normalizedQuery))
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [data, query, statusFilter]);

  async function onSubmit(values: CategoryFormData) {
    const slug = values.slug || slugify(values.name.en);
    const id = values.id || slug;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await saveCategory({ ...values, id, slug } as Category);
      form.reset(emptyCategory);
      await refresh();
      setMessage(text.categorySaved);
      setFormOpen(false);
      setEditingCategoryId(null);
      setExpandedCategoryId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.settingsSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !data) return;
    const items = data.menuItems.filter((item) => item.categoryId === deleteTarget.id);
    setSaving(true);
    setMessage("");
    setError("");
    try {
      if (!items.length) {
        await deleteCategory(deleteTarget.id, deleteTarget.name.en || deleteTarget.slug || deleteTarget.id);
      } else if (deleteMode === "delete") {
        await deleteCategoryWithItems(deleteTarget, items);
      } else {
        // Keep items: move them to the chosen category, or leave them uncategorized (Others).
        const destination = moveTarget ? data.categories.find((entry) => entry.id === moveTarget) || null : null;
        await deleteCategoryKeepItems(deleteTarget, items, destination);
      }
      setDeleteTarget(null);
      setMoveTarget("");
      setDeleteMode("keep");
      await refresh();
      setMessage(text.categoryDeleted);
    } catch (err) {
      setError(err instanceof Error ? err.message : text.settingsSaveFailed);
    } finally {
      setSaving(false);
    }
  }

  function edit(category: Category) {
    setFormOpen(false);
    setExpandedCategoryId(category.id);
    setEditingCategoryId(category.id);
    setMessage("");
    setError("");
    form.reset({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon || "",
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      description: {
        en: category.description.en || "",
        ar: category.description.ar || "",
        ckb: category.description.ckb || ""
      }
    });
  }

  function newCategory() {
    const nextOrder = nextDisplayOrder(data?.categories || []);
    form.reset({ ...emptyCategory, icon: DEFAULT_CATEGORY_ICON, displayOrder: nextOrder });
    setMessage("");
    setError("");
    setEditingCategoryId(null);
    setFormOpen(true);
    setExpandedCategoryId(null);
  }

  function cancelEdit() {
    setEditingCategoryId(null);
    form.reset(emptyCategory);
  }

  async function toggleCategoryActive(category: Category, isActive: boolean) {
    const nextCategory = { ...category, isActive };
    const name = localized(category.name, locale, category.name.en);

    setStatusSavingIds((current) => (current.includes(category.id) ? current : [...current, category.id]));
    setMessage("");
    setError("");
    setData((current) => replaceCategory(current, nextCategory));

    try {
      await updateCategoryActive(category.id, isActive, category.name.en || category.slug || category.id);
      setMessage(`${name}: ${isActive ? text.active : text.inactive}`);
    } catch (err) {
      setData((current) => replaceCategory(current, category));
      setError(err instanceof Error ? err.message : text.categorySaved);
    } finally {
      setStatusSavingIds((current) => current.filter((id) => id !== category.id));
    }
  }

  function startReorder() {
    // Reorder covers ALL categories (ignores search/status filters) so the numbering is meaningful.
    setOrderedCategories([...(data?.categories || [])].sort((a, b) => a.displayOrder - b.displayOrder));
    setReorderMode(true);
    setFormOpen(false);
    setEditingCategoryId(null);
    setExpandedCategoryId(null);
    setMessage("");
    setError("");
  }

  function cancelReorder() {
    setReorderMode(false);
    setOrderedCategories([]);
  }

  async function saveOrder() {
    // Write a global sequential displayOrder in the new visual order; only changed rows are sent.
    const updates = orderedCategories
      .map((entry, index) => ({ id: entry.id, displayOrder: index }))
      .filter((entry, index) => entry.displayOrder !== orderedCategories[index].displayOrder);

    if (!updates.length) {
      cancelReorder();
      return;
    }

    setSavingOrder(true);
    setMessage("");
    setError("");
    try {
      await reorderCategories(updates);
      setData((current) => {
        if (!current) return current;
        const orderById = new Map(updates.map((entry) => [entry.id, entry.displayOrder]));
        return {
          ...current,
          categories: current.categories.map((entry) =>
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

  const targetItemCount = deleteTarget ? data?.menuItems.filter((item) => item.categoryId === deleteTarget.id).length || 0 : 0;
  const allCategories = data?.categories || [];
  const totalItems = data?.menuItems.length || 0;
  const activeCategories = allCategories.filter((category) => category.isActive).length;
  const inactiveCategories = allCategories.length - activeCategories;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">{text.categories}</h1>
          <p className="text-muted-foreground">{text.categoryDescription}</p>
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
              <Button type="button" variant="outline" onClick={startReorder} disabled={!data || (data?.categories.length || 0) < 2}>
                <ListOrdered className="h-4 w-4" aria-hidden />
                {text.reorderItems}
              </Button>
              <Button type="button" onClick={newCategory}>
                <PlusCircle className="h-4 w-4" aria-hidden />
                {text.addCategory}
              </Button>
            </>
          )}
        </div>
      </div>

      {message ? <p className="rounded-md border border-primary/40 bg-primary/5 p-3 text-sm text-primary">{message}</p> : null}
      {error ? <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CatalogStat label={text.totalCategories} value={allCategories.length} />
        <CatalogStat label={text.activeCategories} value={activeCategories} tone="primary" />
        <CatalogStat label={text.inactiveCategories} value={inactiveCategories} />
        <CatalogStat label={text.totalMenuItems} value={totalItems} />
      </div>

      {reorderMode ? (
        <Card className="settings-panel">
          <CardHeader>
            <CardTitle>{text.reorderItems}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{text.reorderHint}</p>
            <ReorderList
              items={orderedCategories}
              onReorder={setOrderedCategories}
              reorderLabel={text.reorderItems}
              positionLabel={text.position}
              dir={dir}
              renderRow={(category) => (
                <>
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CategoryIcon slug={category.slug} icon={category.icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{localized(category.name, locale, category.name.en)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {data?.menuItems.filter((item) => item.categoryId === category.id).length || 0} {text.menuItems}
                    </p>
                  </div>
                </>
              )}
            />
          </CardContent>
        </Card>
      ) : (
      <>
      {formOpen ? (
        <Card className="settings-panel">
          <CardHeader>
            <CardTitle>{text.category}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <CategoryEditorForm
              form={form}
              saving={saving}
              text={text}
              locale={locale}
              itemCount={0}
              onSubmit={onSubmit}
              onCancel={() => setFormOpen(false)}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <Input placeholder={text.searchCategories} value={query} onChange={(event) => setQuery(event.target.value)} />
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">{text.all}</option>
            <option value="active">{text.active}</option>
            <option value="inactive">{text.inactive}</option>
          </Select>
        </div>
        <div className="grid gap-3">
          {!data ? (
            Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-[68px] w-full rounded-xl" />)
          ) : categories.length ? categories.map((category) => {
            const expanded = expandedCategoryId === category.id;
            const itemCount = data?.menuItems.filter((item) => item.categoryId === category.id).length || 0;
            const availableItemCount = data?.menuItems.filter((item) => item.categoryId === category.id && item.isAvailable && !item.isSoldOut).length || 0;
            const missingTranslationCount = missingLocalizedFields(category.name);
            const statusSaving = statusSavingIds.includes(category.id);
            return (
              <Card key={category.id} className={cn(!category.isActive && "bg-muted/20")}>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg p-4 transition-colors hover:bg-muted/50 sm:p-5">
                  <button
                    type="button"
                    className="focus-ring flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md text-start"
                    aria-expanded={expanded}
                    onClick={() => setExpandedCategoryId((current) => (current === category.id ? null : category.id))}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <CategoryIcon slug={category.slug} icon={category.icon} className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{localized(category.name, locale, category.name.en)}</p>
                          <Badge className={cn(category.isActive ? "border-primary/30 bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                            {category.isActive ? text.active : text.inactive}
                          </Badge>
                          {missingTranslationCount ? (
                            <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                              {text.missingTranslations}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          <span lang="en">{category.name.en}</span> / <span lang="ar">{category.name.ar}</span> / <span lang="ckb">{category.name.ckb}</span>
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full border bg-background px-2 py-0.5">{itemCount} {text.menuItems}</span>
                          <span className="rounded-full border bg-background px-2 py-0.5">{availableItemCount} {text.available}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} aria-hidden />
                  </button>
                  <div className="flex shrink-0 items-center gap-2 rounded-md border bg-background px-3 py-2">
                    <span className={cn("text-xs font-semibold", category.isActive ? "text-primary" : "text-muted-foreground")}>
                      {category.isActive ? text.active : text.inactive}
                    </span>
                    <Switch
                      label={`${text.active}: ${localized(category.name, locale, category.name.en)}`}
                      checked={category.isActive}
                      disabled={statusSaving}
                      onCheckedChange={(checked) => toggleCategoryActive(category, checked)}
                    />
                  </div>
                </div>
                {expanded ? (
                  <CardContent className="settings-panel border-t pt-5">
                    {editingCategoryId === category.id ? (
                      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <CategoryEditorForm
                          form={form}
                          saving={saving}
                          text={text}
                          locale={locale}
                          itemCount={itemCount}
                          onSubmit={onSubmit}
                          onCancel={cancelEdit}
                        />
                      </div>
                    ) : (
                      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
                        <CategoryAdminPreview category={category} itemCount={itemCount} locale={locale} text={text} />
                        <div className="flex flex-wrap content-start gap-2">
                          <Button type="button" variant="secondary" asChild>
                            <Link href={`${adminBasePath}/menu-items?category=${encodeURIComponent(category.id)}`}>
                              <PlusCircle className="h-4 w-4" aria-hidden />
                              {text.addItemToCategory}
                            </Link>
                          </Button>
                          <Button type="button" variant="outline" size="icon" aria-label={text.edit} title={text.edit} onClick={() => edit(category)}>
                            <Pencil className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button type="button" variant="destructive" size="icon" aria-label={text.delete} title={text.delete} onClick={() => { setMoveTarget(""); setDeleteMode("keep"); setDeleteTarget(category); }}>
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
              title={query || statusFilter !== "all" ? text.noMatchingCategories : text.noCategoriesYet}
              actionLabel={text.addCategory}
              onAction={newCategory}
            />
          )}
        </div>
      </div>
      </>
      )}

      {deleteTarget ? (
        <div
          className="dialog-backdrop fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          onMouseDown={() => {
            if (!saving) {
              setDeleteTarget(null);
              setDeleteMode("keep");
            }
          }}
        >
          <Card className="dialog-panel w-full max-w-md" onMouseDown={(event) => event.stopPropagation()}>
            <CardHeader>
              <CardTitle>{text.deleteCategory}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {targetItemCount
                  ? formatAdminText(text.categoryHasItems, { count: targetItemCount })
                  : text.categoryHasNoItems}
              </p>
              {targetItemCount ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteMode("keep")}
                      className={cn(
                        "focus-ring rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                        deleteMode === "keep" ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted"
                      )}
                    >
                      {text.keepItems}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteMode("delete")}
                      className={cn(
                        "focus-ring rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                        deleteMode === "delete" ? "border-destructive bg-destructive text-destructive-foreground" : "bg-card hover:bg-muted"
                      )}
                    >
                      {text.deleteItemsToo}
                    </button>
                  </div>
                  {deleteMode === "keep" ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">{formatAdminText(text.keepItemsHint, { count: targetItemCount })}</p>
                      <Select value={moveTarget} onChange={(event) => setMoveTarget(event.target.value)}>
                        <option value="">{text.othersOption}</option>
                        {(data?.categories || [])
                          .filter((category) => category.id !== deleteTarget.id)
                          .map((category) => (
                            <option key={category.id} value={category.id}>{localized(category.name, locale, category.name.en)}</option>
                          ))}
                      </Select>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                      {formatAdminText(text.deleteItemsWarning, { count: targetItemCount })}
                    </p>
                  )}
                </div>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteMode("keep"); }}>{text.cancel}</Button>
                <Button variant="destructive" onClick={confirmDelete} disabled={saving}>{text.delete}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

// Tapping/clicking a name field selects all its text so typing replaces it (or you can copy it).
// A click would otherwise drop a caret and clear the selection, so if this click is what focuses
// the field we take focus over ourselves and let onFocus do the select().
function selectAllOnFocus(event: React.FocusEvent<HTMLInputElement>) {
  event.currentTarget.select();
}

function selectAllOnMouseDown(event: React.MouseEvent<HTMLInputElement>) {
  if (document.activeElement !== event.currentTarget) {
    event.preventDefault();
    event.currentTarget.focus();
  }
}

function CategoryEditorForm({
  form,
  saving,
  text,
  locale,
  itemCount,
  onSubmit,
  onCancel
}: {
  form: UseFormReturn<CategoryFormData>;
  saving: boolean;
  text: Record<string, string>;
  locale: Locale;
  itemCount: number;
  onSubmit: (values: CategoryFormData) => Promise<void>;
  onCancel: () => void;
}) {
  const watchedCategory = form.watch();
  const englishName = form.register("name.en");

  return (
    <>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit, focusFirstInvalidField)}>
        <FormSection title={text.names}>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={text.englishName} error={adminErrorText(form.formState.errors.name?.en?.message, text)}>
              <Input
                lang="en"
                onFocus={selectAllOnFocus}
                onMouseDown={selectAllOnMouseDown}
                {...englishName}
                onChange={(event) => {
                  englishName.onChange(event);
                  if (!form.getValues("slug")) form.setValue("slug", slugify(event.target.value), { shouldValidate: true });
                }}
              />
            </Field>
            <Field label={text.arabicName} error={adminErrorText(form.formState.errors.name?.ar?.message, text)}>
              <Input dir="rtl" lang="ar" onFocus={selectAllOnFocus} onMouseDown={selectAllOnMouseDown} {...form.register("name.ar")} />
            </Field>
            <Field label={text.kurdishName} error={adminErrorText(form.formState.errors.name?.ckb?.message, text)}>
              <Input dir="rtl" lang="ckb" onFocus={selectAllOnFocus} onMouseDown={selectAllOnMouseDown} {...form.register("name.ckb")} />
            </Field>
          </div>
        </FormSection>
        <FormSection title={text.descriptions}>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label={text.englishDescription}>
              <Textarea lang="en" {...form.register("description.en")} />
            </Field>
            <Field label={text.arabicDescription}>
              <Textarea dir="rtl" lang="ar" {...form.register("description.ar")} />
            </Field>
            <Field label={text.kurdishDescription}>
              <Textarea dir="rtl" lang="ckb" {...form.register("description.ckb")} />
            </Field>
          </div>
        </FormSection>
        <FormSection title={text.categoryIcon}>
          {text.categoryIconHint ? <p className="text-xs text-muted-foreground">{text.categoryIconHint}</p> : null}
          <IconPicker value={form.watch("icon") || ""} onChange={(key) => form.setValue("icon", key, { shouldDirty: true })} />
        </FormSection>
        <FormSection title={text.publishing}>
          <Field label={text.slug} error={adminErrorText(form.formState.errors.slug?.message, text)}>
            <Input {...form.register("slug")} />
          </Field>
          <div className="flex items-center justify-between rounded-md border bg-background p-3">
            <span className="text-sm font-medium">{text.active}</span>
            <Switch
              label={text.active}
              checked={Boolean(form.watch("isActive"))}
              onCheckedChange={(checked) => form.setValue("isActive", checked, { shouldDirty: true })}
            />
          </div>
        </FormSection>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>{saving ? text.saving : text.saveCategory}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>{text.cancel}</Button>
        </div>
      </form>
      <CategoryAdminPreview
        category={watchedCategory}
        itemCount={itemCount}
        locale={locale}
        text={text}
      />
    </>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
      {CATEGORY_ICONS.filter((def) => def.key !== "utensils").map((def) => {
        const selected = value === def.key;
        return (
          <button
            key={def.key}
            type="button"
            onClick={() => onChange(def.key)}
            title={def.label}
            aria-label={def.label}
            aria-pressed={selected}
            className={cn(
              "focus-ring flex aspect-square items-center justify-center rounded-lg border transition-colors",
              selected ? "border-primary bg-primary/10 text-primary ring-1 ring-inset ring-primary/40" : "bg-card text-foreground hover:bg-muted"
            )}
          >
            <CategoryIcon icon={def.key} className="h-6 w-6" />
          </button>
        );
      })}
    </div>
  );
}

function CategoryAdminPreview({
  category,
  itemCount,
  locale,
  text
}: {
  category: CategoryFormData | Category;
  itemCount: number;
  locale: Locale;
  text: Record<string, string>;
}) {
  const title = localized(category.name, locale, category.name.en || text.category);
  const description = localized(category.description, locale);
  const slug = category.slug || slugify(category.name.en);

  return (
    <div className="rounded-lg border bg-muted/25 p-3">
      <p className="mb-3 text-sm font-medium">{text.preview}</p>
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="bg-gradient-to-br from-accent via-primary/10 to-secondary/10 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CategoryIcon slug={slug} icon={category.icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h3 className="text-xl font-semibold leading-tight">{title}</h3>
                {description ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{description}</p> : null}
              </div>
            </div>
            <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", category.isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {category.isActive ? text.active : text.inactive}
            </span>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border bg-background px-2.5 py-1">{text.slug}: {slug || "-"}</span>
            <span className="rounded-full border bg-background px-2.5 py-1">{itemCount} {text.menuItems}</span>
          </div>
          <div className="grid gap-2">
            {[0, 1].map((index) => (
              <div key={index} className="flex items-center justify-between rounded-md border bg-background p-3">
                <div className="space-y-1">
                  <div className="h-2.5 w-24 rounded-full bg-primary/20" />
                  <div className="h-2 w-32 rounded-full bg-muted" />
                </div>
                <div className="h-7 w-16 rounded-full bg-secondary/15" />
              </div>
            ))}
          </div>
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

function replaceCategory(data: AppData | null, category: Category): AppData | null {
  if (!data) return data;
  return {
    ...data,
    categories: data.categories.map((entry) => (entry.id === category.id ? category : entry))
  };
}

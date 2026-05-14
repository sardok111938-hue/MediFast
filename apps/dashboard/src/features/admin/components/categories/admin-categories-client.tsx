"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { formatCategoryLabel } from "@medifast/i18n";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { EmptyState } from "../../../../components/ui/empty-state";
import { ErrorState } from "../../../../components/ui/error-state";
import { Input } from "../../../../components/ui/input";
import { LoadingState } from "../../../../components/ui/loading-state";
import { Table } from "../../../../components/ui/table";
import { getSupabaseBrowserClient } from "../../../../lib/supabase/browser";
import { adminCreateCategoryAction, adminDeleteCategoryAction, adminUpdateCategoryAction } from "../../actions";
import type { AdminCategoryRow, AsyncState, CategoryFormValues } from "../shared/admin-types";
import { normalizeError } from "../shared/admin-utils";

const emptyCategoryFormValues: CategoryFormValues = {
  name: "",
  nameAr: "",
  slug: "",
  icon: "",
  imageUrl: "",
  sortOrder: "0",
  isActive: true,
  parentId: "",
};

function getCategoryLabel(category: Pick<AdminCategoryRow, "name" | "nameAr">) {
  return category.nameAr ?? category.name;
}

function buildCategoryFormValues(category?: AdminCategoryRow | null): CategoryFormValues {
  return {
    name: category?.name ?? "",
    nameAr: category?.nameAr ?? "",
    slug: category?.slug ?? "",
    icon: category?.icon ?? "",
    imageUrl: category?.imageUrl ?? "",
    sortOrder: category ? String(category.sortOrder) : "0",
    isActive: category?.isActive ?? true,
    parentId: category?.parentId ?? "",
  };
}

function validateCategoryForm(values: CategoryFormValues, editingCategoryId?: string | null) {
  const sortOrder = Number(values.sortOrder || 0);

  if (!values.name.trim()) {
    return { error: "اسم الفئة مطلوب." };
  }

  if (Number.isNaN(sortOrder)) {
    return { error: "ترتيب العرض يجب أن يكون رقمًا." };
  }

  if (values.parentId && values.parentId === editingCategoryId) {
    return { error: "لا يمكن جعل الفئة تابعة لنفسها." };
  }

  return {
    error: null,
    payload: {
      name: values.name.trim(),
      nameAr: values.nameAr.trim() || null,
      slug: values.slug.trim() || null,
      icon: values.icon.trim() || null,
      imageUrl: values.imageUrl.trim() || null,
      sortOrder,
      isActive: values.isActive,
      parentId: values.parentId.trim() || null,
    },
  };
}

async function loadAdminCategoriesData(): Promise<AdminCategoryRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, name_ar, slug, icon, image_url, sort_order, is_active, parent_id, created_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((category) => ({
    id: String(category.id),
    name: String(category.name),
    nameAr: category.name_ar ? String(category.name_ar) : null,
    slug: category.slug ? String(category.slug) : null,
    icon: category.icon ? String(category.icon) : null,
    imageUrl: category.image_url ? String(category.image_url) : null,
    sortOrder: Number(category.sort_order ?? 0),
    isActive: Boolean(category.is_active),
    parentId: category.parent_id ? String(category.parent_id) : null,
    displayName: formatCategoryLabel({
      name: String(category.name),
      name_ar: category.name_ar ? String(category.name_ar) : null,
    }),
    createdAt: String(category.created_at ?? ""),
  }));
}

function AdminCategoriesManager() {
  const [state, setState] = useState<AsyncState<AdminCategoryRow[]>>({
    data: null,
    error: null,
    loading: true,
  });
  const [categoryForm, setCategoryForm] = useState<CategoryFormValues>(emptyCategoryFormValues);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<CategoryFormValues>(emptyCategoryFormValues);
  const [saving, setSaving] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function load() {
    setState({
      data: null,
      error: null,
      loading: true,
    });

    try {
      const data = await loadAdminCategoriesData();
      setState({
        data,
        error: null,
        loading: false,
      });
    } catch (error) {
      setState({
        data: null,
        error: normalizeError(error),
        loading: false,
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateCategoryForm(categoryForm);
    if (validation.error || !validation.payload) {
      setFeedback({ type: "error", message: validation.error ?? "يرجى مراجعة بيانات الفئة." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const result = await adminCreateCategoryAction(validation.payload);

      if (!result.success) {
        throw new Error(result.error ?? "تعذر إنشاء الفئة.");
      }

      setCategoryForm(emptyCategoryFormValues);
      setFeedback({
        type: "success",
        message: "تم إنشاء الفئة بنجاح.",
      });
      await load();
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeError(error),
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveCategory(categoryId: string) {
    const validation = validateCategoryForm(editingForm, categoryId);
    if (validation.error || !validation.payload) {
      setFeedback({ type: "error", message: validation.error ?? "يرجى مراجعة بيانات الفئة." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const result = await adminUpdateCategoryAction({
        categoryId,
        ...validation.payload,
      });

      if (!result.success) {
        throw new Error(result.error ?? "تعذر تحديث الفئة.");
      }

      setEditingCategoryId(null);
      setEditingForm(emptyCategoryFormValues);
      setFeedback({
        type: "success",
        message: "تم تحديث الفئة بنجاح.",
      });
      await load();
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeError(error),
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(categoryId: string) {
    setDeletingCategoryId(categoryId);
    setFeedback(null);

    try {
      const result = await adminDeleteCategoryAction({
        categoryId,
      });

      if (!result.success) {
        throw new Error(result.error ?? "تعذر حذف الفئة.");
      }

      if (editingCategoryId === categoryId) {
        setEditingCategoryId(null);
        setEditingForm(emptyCategoryFormValues);
      }

      setFeedback({
        type: "success",
        message: "تم حذف الفئة بنجاح. ستستمر المنتجات المرتبطة بالعمل مع فئة فارغة.",
      });
      await load();
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeError(error),
      });
    } finally {
      setDeletingCategoryId(null);
    }
  }

  if (state.loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="جارٍ تحميل الفئات من Supabase..." />
      </Card>
    );
  }

  if (state.error) {
    return (
      <Card className="medical-panel">
        <ErrorState message={state.error} onRetry={() => void load()} />
      </Card>
    );
  }

  const categories = state.data ?? [];
  const displayCategories = categories
    .filter((category) => category.parentId === null)
    .sort((left, right) => {
      const leftSortOrder = left.sortOrder ?? 9999;
      const rightSortOrder = right.sortOrder ?? 9999;

      if (leftSortOrder !== rightSortOrder) {
        return leftSortOrder - rightSortOrder;
      }

      return (left.nameAr ?? left.name).localeCompare(right.nameAr ?? right.name, "ar");
    });
  const parentCategories = displayCategories;

  return (
    <div className="stack">
      <Card className="medical-panel">
        <form className="form-grid" onSubmit={createCategory}>
          <div className="field">
            <label htmlFor="admin-category-name">الاسم الداخلي</label>
            <Input
              id="admin-category-name"
              value={categoryForm.name}
              onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="أدوية"
            />
          </div>
          <div className="field">
            <label htmlFor="admin-category-name-ar">الاسم العربي</label>
            <Input
              id="admin-category-name-ar"
              value={categoryForm.nameAr}
              onChange={(event) => setCategoryForm((current) => ({ ...current, nameAr: event.target.value }))}
              placeholder="الأدوية"
            />
          </div>
          <div className="field">
            <label htmlFor="admin-category-slug">المعرّف النصي</label>
            <Input id="admin-category-slug" value={categoryForm.slug} onChange={(event) => setCategoryForm((current) => ({ ...current, slug: event.target.value }))} placeholder="medicine" />
          </div>
          <div className="field">
            <label htmlFor="admin-category-parent">الفئة الأم</label>
            <select id="admin-category-parent" className="input" value={categoryForm.parentId} onChange={(event) => setCategoryForm((current) => ({ ...current, parentId: event.target.value }))}>
              <option value="">فئة رئيسية</option>
              {parentCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {getCategoryLabel(category)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="admin-category-icon">الأيقونة</label>
            <Input id="admin-category-icon" value={categoryForm.icon} onChange={(event) => setCategoryForm((current) => ({ ...current, icon: event.target.value }))} placeholder="medkit-outline" />
          </div>
          <div className="field">
            <label htmlFor="admin-category-image">رابط الصورة</label>
            <Input id="admin-category-image" value={categoryForm.imageUrl} onChange={(event) => setCategoryForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="https://..." />
          </div>
          <div className="field">
            <label htmlFor="admin-category-sort">ترتيب العرض</label>
            <Input id="admin-category-sort" type="number" value={categoryForm.sortOrder} onChange={(event) => setCategoryForm((current) => ({ ...current, sortOrder: event.target.value }))} />
          </div>
          <div className="field">
            <label className="muted" htmlFor="admin-category-active">
              <input id="admin-category-active" type="checkbox" checked={categoryForm.isActive} onChange={(event) => setCategoryForm((current) => ({ ...current, isActive: event.target.checked }))} /> نشطة
            </label>
          </div>
          <div className="actions">
            <Button type="submit" disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "إضافة فئة"}
            </Button>
          </div>
        </form>
      </Card>

      {feedback ? <p className={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</p> : null}

      {categories.length === 0 ? (
        <Card className="medical-panel">
          <EmptyState title="لا توجد فئات بعد" message="أنشئ أول فئة لتنظيم كتالوج ميدي فاست." />
        </Card>
      ) : (
        <Table
          title="الفئات"
          headers={["الفئة", "Slug", "الأيقونة", "الترتيب", "الحالة", "الإجراءات"]}
          rows={displayCategories.map((category) => [
            editingCategoryId === category.id ? (
              <div key={`${category.id}-edit-fields`} className="form-grid">
                <Input value={editingForm.nameAr} onChange={(event) => setEditingForm((current) => ({ ...current, nameAr: event.target.value }))} placeholder="الاسم العربي" />
                <Input value={editingForm.name} onChange={(event) => setEditingForm((current) => ({ ...current, name: event.target.value }))} placeholder="الاسم الداخلي" />
                <Input value={editingForm.imageUrl} onChange={(event) => setEditingForm((current) => ({ ...current, imageUrl: event.target.value }))} placeholder="رابط الصورة" />
                <select className="input" value={editingForm.parentId} onChange={(event) => setEditingForm((current) => ({ ...current, parentId: event.target.value }))}>
                  <option value="">فئة رئيسية</option>
                  {parentCategories
                    .filter((parentCategory) => parentCategory.id !== category.id)
                    .map((parentCategory) => (
                      <option key={parentCategory.id} value={parentCategory.id}>
                        {getCategoryLabel(parentCategory)}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              `${category.parentId ? "↳ " : ""}${category.displayName || "-"}`
            ),
            editingCategoryId === category.id ? (
              <Input key={`${category.id}-slug-input`} value={editingForm.slug} onChange={(event) => setEditingForm((current) => ({ ...current, slug: event.target.value }))} />
            ) : (
              category.slug ?? "-"
            ),
            editingCategoryId === category.id ? (
              <Input key={`${category.id}-icon-input`} value={editingForm.icon} onChange={(event) => setEditingForm((current) => ({ ...current, icon: event.target.value }))} />
            ) : (
              category.icon ?? "-"
            ),
            editingCategoryId === category.id ? (
              <Input key={`${category.id}-sort-input`} type="number" value={editingForm.sortOrder} onChange={(event) => setEditingForm((current) => ({ ...current, sortOrder: event.target.value }))} />
            ) : (
              String(category.sortOrder)
            ),
            editingCategoryId === category.id ? (
              <label key={`${category.id}-active-input`} className="muted">
                <input type="checkbox" checked={editingForm.isActive} onChange={(event) => setEditingForm((current) => ({ ...current, isActive: event.target.checked }))} /> نشطة
              </label>
            ) : (
              category.isActive ? "نشطة" : "غير نشطة"
            ),
            <div key={`${category.id}-actions`} className="table-actions">
              {editingCategoryId === category.id ? (
                <>
                  <Button disabled={saving} onClick={() => void saveCategory(category.id)}>
                    {saving ? "جارٍ الحفظ..." : "حفظ"}
                  </Button>
                  <Button
                    className="secondary-button"
                    disabled={saving}
                    onClick={() => {
                      setEditingCategoryId(null);
                      setEditingForm(emptyCategoryFormValues);
                    }}
                  >
                    إلغاء
                  </Button>
                </>
              ) : (
                <Button
                  className="secondary-button"
                  disabled={deletingCategoryId === category.id}
                  onClick={() => {
                    setEditingCategoryId(category.id);
                    setEditingForm(buildCategoryFormValues(category));
                  }}
                >
                  تعديل
                </Button>
              )}
              <Button
                className="danger-button"
                disabled={deletingCategoryId === category.id || saving}
                onClick={() => void deleteCategory(category.id)}
              >
                {deletingCategoryId === category.id ? "جارٍ الحذف..." : "حذف"}
              </Button>
            </div>,
          ])}
          emptyMessage="لا توجد فئات متاحة بعد."
        />
      )}
    </div>
  );
}

export function AdminCategoriesClient() {
  return <AdminCategoriesManager />;
}

"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { formatCategoryLabel } from "@medifast/i18n";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { EmptyState } from "../../../../components/ui/empty-state";
import { ErrorState } from "../../../../components/ui/error-state";
import { Input } from "../../../../components/ui/input";
import { LoadingState } from "../../../../components/ui/loading-state";
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

function sortAdminCategories(left: AdminCategoryRow, right: AdminCategoryRow) {
  return left.sortOrder - right.sortOrder || getCategoryLabel(left).localeCompare(getCategoryLabel(right), "ar");
}

function getCategoryChildrenByParentId(categories: AdminCategoryRow[]) {
  const categoriesByParentId = new Map<string, AdminCategoryRow[]>();

  for (const category of categories) {
    if (!category.parentId) {
      continue;
    }

    const children = categoriesByParentId.get(category.parentId) ?? [];
    children.push(category);
    categoriesByParentId.set(category.parentId, children);
  }

  for (const children of categoriesByParentId.values()) {
    children.sort(sortAdminCategories);
  }

  return categoriesByParentId;
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
  const [categoriesResult, productsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, name_ar, slug, icon, image_url, sort_order, is_active, parent_id, created_at")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase.from("products").select("category_id"),
  ]);

  if (categoriesResult.error) {
    throw categoriesResult.error;
  }

  if (productsResult.error) {
    throw productsResult.error;
  }

  const rawCategories = categoriesResult.data ?? [];
  const childCounts = new Map<string, number>();
  const productCounts = new Map<string, number>();

  for (const category of rawCategories) {
    if (category.parent_id) {
      const parentId = String(category.parent_id);
      childCounts.set(parentId, (childCounts.get(parentId) ?? 0) + 1);
    }
  }

  for (const product of productsResult.data ?? []) {
    if (product.category_id) {
      const categoryId = String(product.category_id);
      productCounts.set(categoryId, (productCounts.get(categoryId) ?? 0) + 1);
    }
  }

  return rawCategories.map((category) => ({
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
    childCount: childCounts.get(String(category.id)) ?? 0,
    productCount: productCounts.get(String(category.id)) ?? 0,
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
  const [expandedParentIds, setExpandedParentIds] = useState<Set<string>>(new Set());
  const [showCreateForm, setShowCreateForm] = useState(false);

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
      setShowCreateForm(false);
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
    const category = state.data?.find((nextCategory) => nextCategory.id === categoryId);

    if (category && (category.childCount > 0 || category.productCount > 0)) {
      setFeedback({
        type: "error",
        message: "لا يمكن حذف فئة لديها فئات فرعية أو منتجات مرتبطة. انقلها أو عطّلها أولًا.",
      });
      return;
    }

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
  const parentCategories = categories.filter((category) => category.parentId === null).sort(sortAdminCategories);
  const childCategoriesByParentId = getCategoryChildrenByParentId(categories);

  function toggleParent(parentId: string) {
    setExpandedParentIds((current) => {
      const next = new Set(current);

      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }

      return next;
    });
  }

  function renderCategoryEditFields(category: AdminCategoryRow) {
    return (
      <div className="form-grid">
        <Input value={editingForm.nameAr} onChange={(event) => setEditingForm((current) => ({ ...current, nameAr: event.target.value }))} placeholder="الاسم العربي" />
        <Input value={editingForm.name} onChange={(event) => setEditingForm((current) => ({ ...current, name: event.target.value }))} placeholder="الاسم الداخلي" />
        <Input value={editingForm.slug} onChange={(event) => setEditingForm((current) => ({ ...current, slug: event.target.value }))} placeholder="المعرّف النصي" />
        <Input value={editingForm.icon} onChange={(event) => setEditingForm((current) => ({ ...current, icon: event.target.value }))} placeholder="الأيقونة" />
        <Input type="number" value={editingForm.sortOrder} onChange={(event) => setEditingForm((current) => ({ ...current, sortOrder: event.target.value }))} placeholder="ترتيب العرض" />
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
        <label className="muted">
          <input type="checkbox" checked={editingForm.isActive} onChange={(event) => setEditingForm((current) => ({ ...current, isActive: event.target.checked }))} /> نشطة
        </label>
      </div>
    );
  }

  function renderCategoryActions(category: AdminCategoryRow) {
    const childCount = category.childCount ?? 0;
    const productCount = category.productCount ?? 0;
    const deleteBlockedReason =
      childCount > 0
        ? "الحذف متوقف حتى نقل الفئات الفرعية."
        : productCount > 0
          ? "الحذف متوقف حتى نقل المنتجات المرتبطة."
          : null;

    return (
      <div className="table-actions">
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
        {deleteBlockedReason ? (
          <span className="muted">{deleteBlockedReason}</span>
        ) : (
          <Button className="danger-button" disabled={deletingCategoryId === category.id || saving} onClick={() => void deleteCategory(category.id)}>
            {deletingCategoryId === category.id ? "جارٍ الحذف..." : "حذف"}
          </Button>
        )}
      </div>
    );
  }

  function renderStatusBadge(category: AdminCategoryRow) {
    return (
      <Badge className={category.isActive ? "status-delivered" : "status-cancelled"}>
        {category.isActive ? "نشطة" : "غير نشطة"}
      </Badge>
    );
  }

  return (
    <div className="stack">
      <Card className="medical-panel">
        <div className="split-actions">
          <div>
            <h3 className="order-card-title">الفئات</h3>
            <p className="muted order-card-subtitle">إدارة الفئات الرئيسية والفرعية في كتالوج الصيدلية.</p>
          </div>
          <div className="actions">
            <Button
              className={showCreateForm ? "secondary-button" : ""}
              onClick={() => setShowCreateForm((current) => !current)}
            >
              {showCreateForm ? "إغلاق" : "إضافة فئة"}
            </Button>
          </div>
        </div>

        {showCreateForm ? (
          <form className="form-grid" onSubmit={createCategory} style={{ marginTop: 16 }}>
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
                {saving ? "جارٍ الحفظ..." : "حفظ الفئة"}
              </Button>
              <Button
                type="button"
                className="secondary-button"
                disabled={saving}
                onClick={() => {
                  setShowCreateForm(false);
                  setCategoryForm(emptyCategoryFormValues);
                }}
              >
                إلغاء
              </Button>
            </div>
          </form>
        ) : null}
      </Card>

      {feedback ? <p className={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</p> : null}

      {categories.length === 0 ? (
        <Card className="medical-panel">
          <EmptyState title="لا توجد فئات بعد" message="أنشئ أول فئة لتنظيم كتالوج ميدي فاست." />
        </Card>
      ) : (
        <div className="stack">
          {parentCategories.map((parentCategory) => {
            const childCategories = childCategoriesByParentId.get(parentCategory.id) ?? [];
            const isExpanded = expandedParentIds.has(parentCategory.id);
            const childCount = parentCategory.childCount ?? 0;
            const productCount = parentCategory.productCount ?? 0;

            return (
              <Card key={parentCategory.id} className="medical-panel">
                <div className="split-actions">
                  <div className="stack compact-stack">
                    {editingCategoryId === parentCategory.id ? (
                      renderCategoryEditFields(parentCategory)
                    ) : (
                      <>
                        <h3 className="order-card-title">{parentCategory.displayName || getCategoryLabel(parentCategory)}</h3>
                        <p className="muted order-card-subtitle">
                          {parentCategory.slug ?? "-"} · {parentCategory.icon ?? "-"}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="table-actions">
                    {renderStatusBadge(parentCategory)}
                    <span className="muted">{childCount} فئات فرعية</span>
                    <span className="muted">{productCount} منتجات</span>
                    {renderCategoryActions(parentCategory)}
                    <Button className="secondary-button" onClick={() => toggleParent(parentCategory.id)}>
                      {isExpanded ? "إخفاء الفئات الفرعية" : "عرض الفئات الفرعية"}
                    </Button>
                  </div>
                </div>

                {isExpanded ? (
                  childCategories.length > 0 ? (
                    <div className="stack compact-stack" style={{ marginTop: 16 }}>
                      {childCategories.map((childCategory) => {
                        const childProductCount = childCategory.productCount ?? 0;

                        return (
                          <div
                            key={childCategory.id}
                            className="medical-panel"
                            style={{
                              background: "#F8FCF9",
                              borderColor: "#E3EFE8",
                              borderRadius: 16,
                              borderWidth: 1,
                              borderStyle: "solid",
                              padding: 14,
                            }}
                          >
                            <div className="split-actions">
                              <div className="stack compact-stack">
                                {editingCategoryId === childCategory.id ? (
                                  renderCategoryEditFields(childCategory)
                                ) : (
                                  <>
                                    <strong>{childCategory.displayName || getCategoryLabel(childCategory)}</strong>
                                    <span className="muted">
                                      {childCategory.slug ?? "-"} · {childCategory.icon ?? "-"} · ترتيب {childCategory.sortOrder}
                                    </span>
                                  </>
                                )}
                              </div>

                              <div className="table-actions">
                                {renderStatusBadge(childCategory)}
                                <span className="muted">{childProductCount} منتجات</span>
                                {renderCategoryActions(childCategory)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="muted" style={{ marginTop: 16 }}>
                      لا توجد فئات فرعية لهذا القسم.
                    </p>
                  )
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AdminCategoriesClient() {
  return <AdminCategoriesManager />;
}

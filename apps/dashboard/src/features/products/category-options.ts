import type { ProductCategoryOption } from "../../types/dashboard";

export type ProductCategorySelection = {
  parentCategoryId: string;
  childCategoryId: string;
};

export function getCategoryOptionLabel(category: Pick<ProductCategoryOption, "name" | "name_ar" | "display_name">) {
  return category.name_ar?.trim() || category.display_name || category.name;
}

export function sortCategoryOptions(left: ProductCategoryOption, right: ProductCategoryOption) {
  return (
    Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0) ||
    getCategoryOptionLabel(left).localeCompare(getCategoryOptionLabel(right), "ar")
  );
}

export function getTopLevelCategoryOptions(categories: ProductCategoryOption[]) {
  return categories.filter((category) => !category.parent_id).sort(sortCategoryOptions);
}

export function getChildCategoryOptions(categories: ProductCategoryOption[], parentCategoryId?: string | null) {
  if (!parentCategoryId) {
    return [];
  }

  return categories.filter((category) => category.parent_id === parentCategoryId).sort(sortCategoryOptions);
}

export function getProductCategorySelection(
  categories: ProductCategoryOption[],
  categoryId?: string | null,
): ProductCategorySelection {
  const category = categories.find((nextCategory) => nextCategory.id === categoryId);

  if (!category) {
    return {
      parentCategoryId: "",
      childCategoryId: "",
    };
  }

  if (category.parent_id) {
    return {
      parentCategoryId: category.parent_id,
      childCategoryId: category.id,
    };
  }

  return {
    parentCategoryId: category.id,
    childCategoryId: "",
  };
}

export function getSubmittedProductCategoryId(
  values: { parent_category_id: string; child_category_id: string },
  categories: ProductCategoryOption[],
) {
  const childCategories = getChildCategoryOptions(categories, values.parent_category_id);

  return childCategories.length > 0 ? values.child_category_id.trim() : values.parent_category_id.trim();
}

export function getCategoryPathDisplayName(categories: ProductCategoryOption[], categoryId?: string | null) {
  const category = categories.find((nextCategory) => nextCategory.id === categoryId);

  if (!category) {
    return "-";
  }

  if (!category.parent_id) {
    return getCategoryOptionLabel(category);
  }

  const parentCategory = categories.find((nextCategory) => nextCategory.id === category.parent_id);
  return parentCategory
    ? `${getCategoryOptionLabel(parentCategory)} ← ${getCategoryOptionLabel(category)}`
    : getCategoryOptionLabel(category);
}

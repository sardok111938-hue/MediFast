import { formatCurrencyLYD, type CartItem, type Product } from "@medifast/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { refreshCartItemSnapshot, removeProductFromCart, setCartItemQuantity } from "./cart-store";
import { isSupabaseConfigured, supabase } from "./supabase";

type QueryProduct = {
  id: string;
  vendor_id: string;
  category_id?: string | null;
  name: string;
  description?: string | null;
  price?: number | string | null;
  image_url?: string | null;
  resolved_image_url?: string | null;
  barcode?: string | null;
  stock_quantity?: number | null;
  is_active?: boolean | null;
};

export type CartFreshnessIssue =
  | { productId: string; kind: "missing"; message: string }
  | { productId: string; kind: "inactive"; message: string }
  | { productId: string; kind: "out_of_stock"; message: string }
  | { productId: string; kind: "quantity_exceeds_stock"; message: string; availableStock: number }
  | { productId: string; kind: "price_changed"; message: string; oldPrice: number; newPrice: number };

type CartFreshnessState = {
  loading: boolean;
  error: string | null;
  issues: CartFreshnessIssue[];
  valid: boolean;
  refresh: () => Promise<void>;
  removeItem: (productId: string) => void;
  reduceToAvailableStock: (productId: string, availableStock: number) => void;
  issuesByProductId: Record<string, CartFreshnessIssue[]>;
};

function isBlockingIssue(issue: CartFreshnessIssue) {
  return issue.kind !== "price_changed";
}

function mapProduct(product: QueryProduct): Product {
  return {
    id: product.id,
    vendor_id: product.vendor_id,
    category_id: String(product.category_id ?? ""),
    name: product.name,
    description: String(product.description ?? ""),
    price: Number(product.price ?? 0),
    image_url:
      product.resolved_image_url?.trim() ||
      product.image_url?.trim() ||
      null,
    barcode: product.barcode ?? null,
    stock_quantity: Number(product.stock_quantity ?? 0),
    is_active: Boolean(product.is_active),
  };
}

function formatCurrency(value: number) {
  return formatCurrencyLYD(value);
}

async function fetchLiveProducts(productIds: string[]) {
  const { data, error } = await supabase
    .from("products_with_global_images")
    .select(`
      id,
      vendor_id,
      category_id,
      name,
      description,
      price,
      stock_quantity,
      barcode,
      is_active,
      image_url,
      resolved_image_url
    `)
    .in("id", productIds);

  if (error) {
    throw error;
  }

  return ((data ?? []) as QueryProduct[]).map(mapProduct);
}

export function useCartFreshness(cartItems: CartItem[]): CartFreshnessState {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<CartFreshnessIssue[]>([]);
  const [priceChangeNotices, setPriceChangeNotices] = useState<Record<string, CartFreshnessIssue>>({});

  const validate = useCallback(async () => {
    if (!isSupabaseConfigured() || cartItems.length === 0) {
      setPriceChangeNotices({});
      setIssues([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const productIds = [...new Set(cartItems.map((item) => item.product_id))];
      const liveProducts = await fetchLiveProducts(productIds);
      const liveById = new Map(liveProducts.map((product) => [product.id, product]));
      const nextIssues: CartFreshnessIssue[] = [];
      const nextPriceChangeNotices: Record<string, CartFreshnessIssue> = {};

      for (const item of cartItems) {
        const liveProduct = liveById.get(item.product_id);

        if (!liveProduct) {
          nextIssues.push({
            productId: item.product_id,
            kind: "missing",
            message: `تمت إزالة المنتج "${item.snapshot.name}" من الكتالوج ولم يعد متاحًا للطلب.`,
          });
          continue;
        }

        const snapshotChanged =
          item.snapshot.name !== liveProduct.name ||
          item.snapshot.description !== liveProduct.description ||
          item.snapshot.image_url !== liveProduct.image_url ||
          item.snapshot.barcode !== (liveProduct.barcode ?? null) ||
          item.snapshot.category_id !== liveProduct.category_id ||
          item.snapshot.vendor_id !== liveProduct.vendor_id ||
          item.snapshot.stock_quantity !== liveProduct.stock_quantity ||
          item.snapshot.is_active !== liveProduct.is_active ||
          item.snapshot.price !== liveProduct.price;

        if (snapshotChanged) {
          refreshCartItemSnapshot(liveProduct);
        }

        if (!liveProduct.is_active) {
          nextIssues.push({
            productId: item.product_id,
            kind: "inactive",
            message: `المنتج "${liveProduct.name}" غير نشط حاليًا ولا يمكن طلبه الآن.`,
          });
        }

        if (liveProduct.stock_quantity <= 0) {
          nextIssues.push({
            productId: item.product_id,
            kind: "out_of_stock",
            message: `المنتج "${liveProduct.name}" نفد من المخزون حاليًا.`,
          });
        } else if (item.quantity > liveProduct.stock_quantity) {
          nextIssues.push({
            productId: item.product_id,
            kind: "quantity_exceeds_stock",
            availableStock: liveProduct.stock_quantity,
            message: `الكمية المطلوبة من "${liveProduct.name}" أكبر من المخزون الحالي. المتاح الآن: ${liveProduct.stock_quantity}.`,
          });
        }

        if (item.snapshot.price !== liveProduct.price) {
          nextPriceChangeNotices[item.product_id] = {
            productId: item.product_id,
            kind: "price_changed",
            oldPrice: item.snapshot.price,
            newPrice: liveProduct.price,
            message: `تم تحديث سعر "${liveProduct.name}" من ${formatCurrency(item.snapshot.price)} إلى ${formatCurrency(liveProduct.price)}.`,
          };
        }
      }

      const mergedNotices = Object.fromEntries(
        Object.entries(nextPriceChangeNotices).filter(([productId]) => productIds.includes(productId))
      );

      setPriceChangeNotices(mergedNotices);
      setIssues([...nextIssues, ...Object.values(mergedNotices)]);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "تعذر التحقق من صلاحية السلة الآن.");
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }, [cartItems]);

  useEffect(() => {
    void validate();
  }, [validate]);

  const issuesByProductId = useMemo(() => {
    return issues.reduce<Record<string, CartFreshnessIssue[]>>((result, issue) => {
      result[issue.productId] = [...(result[issue.productId] ?? []), issue];
      return result;
    }, {});
  }, [issues]);

  const valid = useMemo(
    () => !loading && !error && issues.every((issue) => !isBlockingIssue(issue)),
    [error, issues, loading]
  );

  return {
    loading,
    error,
    issues,
    valid,
    refresh: validate,
    removeItem: (productId: string) => {
      setPriceChangeNotices((current) => {
        const next = { ...current };
        delete next[productId];
        return next;
      });
      removeProductFromCart(productId);
    },
    reduceToAvailableStock: (productId: string, availableStock: number) => setCartItemQuantity(productId, availableStock),
    issuesByProductId,
  };
}
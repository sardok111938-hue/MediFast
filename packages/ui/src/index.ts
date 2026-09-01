import type {
  Address,
  CartItem,
  Category,
  DashboardStat,
  Driver,
  Order,
  Product,
  Vendor,
} from "@medifast/types";

export const designTokens = {
  colors: {
    primary: "#1A9C5A",
    "primary-muted": "#E8F7EE",
    background: "#F8FCF8",
    surface: "#FFFFFF",
    border: "#DCEBDF",
    success: "#127244",
    warning: "#F6B73C",
    danger: "#B23A48",
    info: "#1F5AA8",
    "text-primary": "#163020",
    "text-secondary": "#6B7A72",
  },
  spacing: {
    4: 4,
    8: 8,
    12: 12,
    16: 16,
    20: 20,
    24: 24,
    32: 32,
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 24,
  },
typography: {
  heading: {
    xl: 26,
    lg: 21,
    md: 17,
  },

  body: {
    lg: 16,
    md: 15,
    sm: 13,
  },

  caption: {
    md: 12,
    sm: 11,
  },

  lineHeight: {
    compact: 20,
    body: 22,
    relaxed: 24,
  },
},  shadows: {
    card: {
      shadowColor: "#113321",
      shadowOpacity: 0.05,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
  },
  status: {
    success: {
      background: "#E5F7ED",
      text: "#0D6A3D",
    },
    warning: {
      background: "#FFF3D9",
      text: "#8E5B00",
    },
    danger: {
      background: "#FBE4E7",
      text: "#A02E3D",
    },
    info: {
      background: "#E7F1FF",
      text: "#1F5AA8",
    },
    neutral: {
      background: "#E8F7EE",
      text: "#127244",
    },
  },
} as const;

export const theme = {
  colors: {
    background: designTokens.colors.background,
    surface: designTokens.colors.surface,
    primary: designTokens.colors.primary,
    primaryDark: designTokens.colors.success,
    text: designTokens.colors["text-primary"],
    muted: designTokens.colors["text-secondary"],
    border: designTokens.colors.border,
    accent: designTokens.colors["primary-muted"],
    warning: designTokens.colors.warning,
    success: designTokens.colors.success,
    danger: designTokens.colors.danger,
    info: designTokens.colors.info,
  },
  spacing: designTokens.spacing,
  radius: designTokens.radius,
  typography: designTokens.typography,
  shadows: designTokens.shadows,
  status: designTokens.status,
};

export const categories: Category[] = [
  { id: "cat-1", name: "medicine", name_ar: "الأدوية", slug: "medicine", icon: "medkit-outline", parent_id: null, sort_order: 1, is_active: true },
  { id: "cat-2", name: "medical-devices", name_ar: "الأجهزة الطبية", slug: "medical-devices", icon: "fitness-outline", parent_id: null, sort_order: 2, is_active: true },
  { id: "cat-3", name: "personal-care", name_ar: "العناية الشخصية", slug: "personal-care", icon: "sparkles-outline", parent_id: null, sort_order: 3, is_active: true },
  { id: "cat-4", name: "skin-hair-care", name_ar: "البشرة والشعر", slug: "skin-hair-care", icon: "leaf-outline", parent_id: null, sort_order: 4, is_active: true },
  { id: "cat-5", name: "mother-baby", name_ar: "الأم والطفل", slug: "mother-baby", icon: "heart-outline", parent_id: null, sort_order: 5, is_active: true },
  { id: "cat-6", name: "vitamins-nutrition", name_ar: "الفيتامينات والتغذية", slug: "vitamins-nutrition", icon: "nutrition-outline", parent_id: null, sort_order: 6, is_active: true },
];

export const vendors: Vendor[] = [
  {
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    name: "صيدلية جرين كير",
    vendor_type: "pharmacy",
    address: "شارع الملك 14، المنطقة المركزية",
    rating: 4.8,
    eta_minutes: 18,
    completed_orders: 0,
    is_open: true,
  },
  {
    id: "ddddcccc-cccc-cccc-cccc-cccccccccccc",
    name: "صيدلية ويل سبرينغ",
    vendor_type: "pharmacy",
    address: "جادة سيدار 22، الجهة الغربية",
    rating: 4.6,
    eta_minutes: 26,
    completed_orders: 0,
    is_open: true,
  },
];

export const products: Product[] = [
  {
    id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    vendor_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    category_id: "cat-1",
    name: "باراسيتامول 500 مجم",
    description: "تخفيف سريع للحمى والآلام الخفيفة.",
    price: 6.5,
    image_url: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=800&q=80",
    barcode: "890100000001",
    stock_quantity: 120,
    is_active: true,
    express: true,
  },
  {
    id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
    vendor_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    category_id: "cat-2",
    name: "أقراص فيتامين سي",
    description: "دعم يومي للمناعة بنكهة البرتقال.",
    price: 12,
    image_url: "https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=800&q=80",
    barcode: "890100000002",
    stock_quantity: 75,
    is_active: true,
  },
  {
    id: "cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd",
    vendor_id: "ddddcccc-cccc-cccc-cccc-cccccccccccc",
    category_id: "cat-5",
    name: "ميزان حرارة رقمي",
    description: "قراءات سريعة لدرجة الحرارة للاستخدام المنزلي.",
    price: 24,
    image_url: "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=800&q=80",
    barcode: "890100000003",
    stock_quantity: 20,
    is_active: true,
    express: true,
  },
];

export const cartItems: CartItem[] = [
  {
    id: "cart-1",
    product_id: products[0].id,
    quantity: 2,
    snapshot: {
      product_id: products[0].id,
      vendor_id: products[0].vendor_id,
      category_id: products[0].category_id,
      name: products[0].name,
      description: products[0].description,
      price: products[0].price,
      image_url: products[0].image_url,
      barcode: products[0].barcode ?? null,
      stock_quantity: products[0].stock_quantity,
      is_active: products[0].is_active,
    },
  },
  {
    id: "cart-2",
    product_id: products[1].id,
    quantity: 1,
    snapshot: {
      product_id: products[1].id,
      vendor_id: products[1].vendor_id,
      category_id: products[1].category_id,
      name: products[1].name,
      description: products[1].description,
      price: products[1].price,
      image_url: products[1].image_url,
      barcode: products[1].barcode ?? null,
      stock_quantity: products[1].stock_quantity,
      is_active: products[1].is_active,
    },
  },
];

export const addresses: Address[] = [
  {
    id: "addr-1",
    line_1: "48 Maple Residency",
    lat: 24.7136,
    lng: 46.6753,
  },
  {
    id: "addr-2",
    line_1: "Axis Medical Tower",
    lat: 24.716,
    lng: 46.69,
  },
];

export const orders: Order[] = [
  {
    id: "order-1001",
    customer_id: "cust-1",
    vendor_id: "vendor-1",
    driver_id: "driver-1",
    subtotal: 25,
    delivery_fee: 4,
    total: 29,
    payment_method: "cash_on_delivery",
    payment_status: "pending",
    order_status: "on_the_way",
    delivery_address_id: "addr-1",
    created_at: new Date().toISOString(),
  },
];

export const drivers: Driver[] = [
  {
    id: "driver-1",
    user_id: "user-driver-1",
    full_name: "أمينة يوسف",
    is_available: true,
    current_lat: 24.7148,
    current_lng: 46.6814,
    approval_status: "approved",
  },
  {
    id: "driver-2",
    user_id: "user-driver-2",
    full_name: "داود منساه",
    is_available: false,
    current_lat: 24.709,
    current_lng: 46.671,
    approval_status: "approved",
  },
];

export const adminStats: DashboardStat[] = [
  { label: "طلبات اليوم", value: "148", hint: "+12% مقارنة بالأمس" },
  { label: "سائقون نشطون", value: "32", hint: "5 قريبون ومتاحون" },
  { label: "صيدليات فعالة", value: "18", hint: "2 بانتظار الاعتماد" },
  { label: "تحصيل نقدي معلق", value: "1,284.00 د.ل", hint: "للمطابقة اليوم" },
];

export const vendorStats: DashboardStat[] = [
  { label: "طلبات جديدة", value: "14", hint: "3 تحتاج إجراء الآن" },
  { label: "منتجات نشطة", value: "126", hint: "9 منخفضة المخزون" },
  { label: "جاهزة للاستلام", value: "5", hint: "سائقون قريبون" },
  { label: "إيراد اليوم", value: "436.00 د.ل", hint: "دفع عند الاستلام" },
];

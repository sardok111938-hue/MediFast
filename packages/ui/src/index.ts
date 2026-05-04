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
      xl: 30,
      lg: 22,
      md: 18,
    },
    body: {
      lg: 16,
      md: 15,
      sm: 14,
    },
    caption: {
      md: 13,
      sm: 12,
    },
    lineHeight: {
      compact: 20,
      body: 22,
      relaxed: 24,
    },
  },
  shadows: {
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
  { id: "cat-1", name: "الأدوية", icon: "cross" },
  { id: "cat-2", name: "الفيتامينات", icon: "leaf" },
  { id: "cat-3", name: "العناية بالبشرة", icon: "sparkles" },
  { id: "cat-4", name: "العناية بالأطفال", icon: "heart" },
  { id: "cat-5", name: "الأجهزة الطبية", icon: "pulse" },
  { id: "cat-6", name: "العناية الشخصية", icon: "drop" },
];

export const vendors: Vendor[] = [
  {
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    name: "صيدلية جرين كير",
    address: "شارع الملك 14، المنطقة المركزية",
    rating: 4.8,
    eta_minutes: 18,
    is_open: true,
  },
  {
    id: "ddddcccc-cccc-cccc-cccc-cccccccccccc",
    name: "صيدلية ويل سبرينغ",
    address: "جادة سيدار 22، الجهة الغربية",
    rating: 4.6,
    eta_minutes: 26,
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
  { id: "cart-1", product: products[0], quantity: 2 },
  { id: "cart-2", product: products[1], quantity: 1 },
];

export const addresses: Address[] = [
  {
    id: "addr-1",
    label: "Home",
    line_1: "48 Maple Residency",
    line_2: "Flat 7C",
    city: "Sedalia Heights",
    area: "Central District",
    lat: 24.7136,
    lng: 46.6753,
  },
  {
    id: "addr-2",
    label: "Office",
    line_1: "Axis Medical Tower",
    city: "Sedalia Heights",
    area: "Business Park",
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
    full_name: "Amina Yusuf",
    is_available: true,
    current_lat: 24.7148,
    current_lng: 46.6814,
    approval_status: "approved",
  },
  {
    id: "driver-2",
    user_id: "user-driver-2",
    full_name: "David Mensah",
    is_available: false,
    current_lat: 24.709,
    current_lng: 46.671,
    approval_status: "approved",
  },
];

export const adminStats: DashboardStat[] = [
  { label: "Orders Today", value: "148", hint: "+12% vs yesterday" },
  { label: "Active Drivers", value: "32", hint: "5 nearby idle" },
  { label: "Live Vendors", value: "18", hint: "2 awaiting approval" },
  { label: "COD Pending", value: "$1,284", hint: "to reconcile today" },
];

export const vendorStats: DashboardStat[] = [
  { label: "New Orders", value: "14", hint: "3 need action now" },
  { label: "Active Products", value: "126", hint: "9 low stock" },
  { label: "Ready for Pickup", value: "5", hint: "drivers nearby" },
  { label: "Today Revenue", value: "$436", hint: "cash on delivery" },
];

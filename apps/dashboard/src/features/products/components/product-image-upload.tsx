import { Card } from "../../../components/ui/card";

export function ProductImageUpload() {
  return (
    <Card>
      <p className="muted">تُرفع صور المنتجات إلى حاوية Supabase Storage باسم `product-images` وتُحفظ في `products.image_url`.</p>
    </Card>
  );
}

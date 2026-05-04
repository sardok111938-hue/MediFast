import { Card } from "../../../components/ui/card";

export function ProductImageUpload() {
  return (
    <Card>
      <p className="muted">Product images are uploaded to the `product-images` Supabase Storage bucket and saved to `products.image_url`.</p>
    </Card>
  );
}

import { storageBuckets } from "@medifast/supabase";
import { getSupabaseServerClient } from "../../lib/supabase/server";

export async function uploadProductImage(file: File) {
  const supabase = getSupabaseServerClient();
  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `products/${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(storageBuckets.productImages).upload(path, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });

  if (error) {
    return {
      data: null,
      error,
    };
  }

  const { data } = supabase.storage.from(storageBuckets.productImages).getPublicUrl(path);

  return {
    data: {
      path,
      publicUrl: data.publicUrl,
    },
    error: null,
  };
}

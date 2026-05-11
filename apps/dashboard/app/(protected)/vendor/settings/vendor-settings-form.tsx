"use client";

import { useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "../../../../src/lib/supabase/browser";
import { Button } from "../../../../src/components/ui/button";
import { Input } from "../../../../src/components/ui/input";
import type { VendorSettingsData } from "../../../../src/features/vendors/settings";
import { vendorUpdateSettingsAction } from "./actions";

export function VendorSettingsForm({ vendor }: { vendor: VendorSettingsData }) {
  const [name, setName] = useState(vendor.name);
  const [description, setDescription] = useState(vendor.description);
  const [phone, setPhone] = useState(vendor.phone);
  const [addressLine1, setAddressLine1] = useState(vendor.address_line_1);
  const [city, setCity] = useState(vendor.city);
  const [area, setArea] = useState(vendor.area);
  const [imageUrl, setImageUrl] = useState(vendor.image_url);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleImageUpload(file: File) {
  setLoading(true);
  setMessage("");

  const supabase = getSupabaseBrowserClient();
  const fileExt = file.name.split(".").pop() || "jpg";
  const filePath = `${vendor.id}/profile-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("vendor-images")
    .upload(filePath, file, {
      upsert: true,
    });

  if (uploadError) {
    setLoading(false);
    setMessage(uploadError.message);
    return;
  }

  const { data } = supabase.storage
    .from("vendor-images")
    .getPublicUrl(filePath);

  setImageUrl(data.publicUrl);
  setLoading(false);
  setMessage("تم رفع الصورة. اضغط حفظ لتحديث المتجر.");
}

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setMessage("اسم المتجر مطلوب.");
      return;
    }

    setLoading(true);
    setMessage("");

    const result = await vendorUpdateSettingsAction({
      name: name.trim(),
      description: description.trim(),
      phone: phone.trim(),
      addressLine1: addressLine1.trim(),
      city: city.trim(),
      area: area.trim(),
      imageUrl: imageUrl.trim(),
    });

    setLoading(false);
    setMessage(result.success ? "تم حفظ إعدادات المتجر بنجاح." : result.error ?? "تعذر حفظ إعدادات المتجر.");
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        direction: "rtl",
      }}
    >
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            style={{
              width: 96,
              height: 96,
              objectFit: "cover",
              borderRadius: 20,
              border: "1px solid rgba(148, 163, 184, 0.35)",
            }}
          />
        ) : (
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 20,
              border: "1px dashed rgba(148, 163, 184, 0.6)",
              display: "grid",
              placeItems: "center",
              color: "#64748b",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            لا توجد صورة
          </div>
        )}

        <div>
          <strong style={{ display: "block", fontSize: 18 }}>{name || "اسم المتجر"}</strong>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            أضف رابط صورة مؤقتًا. رفع الصور من الجهاز يمكن إضافته لاحقًا.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 16,
          width: "100%",
        }}
      >
        <Input placeholder="اسم المتجر / الصيدلية" value={name} onChange={(event) => setName(event.target.value)} />
        <input
  type="file"
  accept="image/*"
  onChange={(event) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleImageUpload(file);
    }
  }}
/>
        <Input placeholder="رقم الهاتف" value={phone} onChange={(event) => setPhone(event.target.value)} />
        <Input placeholder="المدينة" value={city} onChange={(event) => setCity(event.target.value)} />
        <Input placeholder="المنطقة" value={area} onChange={(event) => setArea(event.target.value)} />
        <Input placeholder="العنوان" value={addressLine1} onChange={(event) => setAddressLine1(event.target.value)} />
        <Input placeholder="وصف مختصر للمتجر" value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>

      {message ? (
        <p className={message.includes("بنجاح") ? "success" : "danger"} style={{ margin: 0 }}>
          {message}
        </p>
      ) : null}

      <div style={{ display: "flex", justifyContent: "flex-start" }}>
        <Button type="submit" loading={loading}>
          {loading ? "جارٍ الحفظ..." : "حفظ إعدادات المتجر"}
        </Button>
      </div>
    </form>
  );
}
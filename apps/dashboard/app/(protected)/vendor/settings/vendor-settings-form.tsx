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

  const [lat, setLat] = useState(vendor.lat);
  const [lng, setLng] = useState(vendor.lng);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(vendor.delivery_radius_km);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function resizeImageToSquare(file: File): Promise<Blob> {
    const image = document.createElement("img");
    const objectUrl = URL.createObjectURL(file);

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("تعذر قراءة الصورة."));
      image.src = objectUrl;
    });

    const size = 800;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      URL.revokeObjectURL(objectUrl);
      throw new Error("تعذر تجهيز الصورة.");
    }

    ctx.fillStyle = "#F7FAF8";
    ctx.fillRect(0, 0, size, size);

    const scale = Math.min(size / image.width, size / image.height);

    const width = image.width * scale;
    const height = image.height * scale;

    const x = (size - width) / 2;
    const y = (size - height) / 2;

    ctx.drawImage(image, x, y, width, height);

    URL.revokeObjectURL(objectUrl);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("تعذر ضغط الصورة."));
          }
        },
        "image/jpeg",
        0.82,
      );
    });
  }

  async function handleImageUpload(file: File) {
    setLoading(true);
    setMessage("");

    try {
      const supabase = getSupabaseBrowserClient();

      if (!file.type.startsWith("image/")) {
        setMessage("يرجى اختيار ملف صورة صالح.");
        setLoading(false);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setMessage("حجم الصورة يجب ألا يتجاوز 5MB.");
        setLoading(false);
        return;
      }

      const optimizedImage = await resizeImageToSquare(file);

      const filePath = `${vendor.id}/profile-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("vendor-images")
        .upload(filePath, optimizedImage, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        setMessage(uploadError.message);
        return;
      }

      const { data } = supabase.storage
        .from("vendor-images")
        .getPublicUrl(filePath);

      setImageUrl(data.publicUrl);

      setMessage("تم رفع الصورة. اضغط حفظ لتحديث المتجر.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر رفع الصورة.");
    } finally {
      setLoading(false);
    }
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
      lat: lat.trim(),
      lng: lng.trim(),
      deliveryRadiusKm: deliveryRadiusKm.trim(),
    });

    setLoading(false);

    setMessage(
      result.success
        ? "تم حفظ إعدادات المتجر بنجاح."
        : result.error ?? "تعذر حفظ إعدادات المتجر.",
    );
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
              objectPosition: "center",
              backgroundColor: "#F7FAF8",
              padding: 6,
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
          <strong style={{ display: "block", fontSize: 18 }}>
            {name || "اسم المتجر"}
          </strong>

          <p className="muted" style={{ margin: "6px 0 0" }}>
            قم برفع صورة شعار أو واجهة المتجر لتظهر للزبائن داخل التطبيق.
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
        <Input
          placeholder="اسم المتجر / الصيدلية"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

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

        <Input
          placeholder="رقم الهاتف"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />

        <Input
          placeholder="المدينة"
          value={city}
          onChange={(event) => setCity(event.target.value)}
        />

        <Input
          placeholder="المنطقة"
          value={area}
          onChange={(event) => setArea(event.target.value)}
        />

        <Input
          placeholder="العنوان"
          value={addressLine1}
          onChange={(event) => setAddressLine1(event.target.value)}
        />

        <Input
          placeholder="خط العرض Latitude"
          value={lat}
          onChange={(event) => setLat(event.target.value)}
        />

        <Input
          placeholder="خط الطول Longitude"
          value={lng}
          onChange={(event) => setLng(event.target.value)}
        />

        <Input
          placeholder="نطاق التوصيل بالكيلومتر"
          value={deliveryRadiusKm}
          onChange={(event) => setDeliveryRadiusKm(event.target.value)}
        />

        <Input
          placeholder="وصف مختصر للمتجر"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <p className="muted" style={{ margin: 0 }}>
        مثال الإحداثيات:
        {" "}
        32.887 / 13.191
      </p>

      {message ? (
        <p
          className={message.includes("بنجاح") ? "success" : "danger"}
          style={{ margin: 0 }}
        >
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
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { EmptyState } from "../../../components/ui/empty-state";
import { ErrorState } from "../../../components/ui/error-state";
import { Input } from "../../../components/ui/input";
import { LoadingState } from "../../../components/ui/loading-state";
import { Table } from "../../../components/ui/table";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";
import { useLocale } from "../../../lib/i18n/locale-context";

type ApprovalStatus = "pending" | "approved" | "rejected";
type RoleFilter = "" | "admin" | "vendor" | "customer" | "driver";

type AsyncState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

type VendorRow = {
  vendorId: string;
  profileId: string | null;
  authUserId: string | null;

  email: string | null;
  contactEmail: string | null;

  profileFullName: string;
  profileRole: string | null;

  vendorName: string;
  slug: string | null;

  description: string | null;

  imageUrl: string | null;
  licenseNumber: string | null;

  phone: string | null;

  addressLine1: string | null;
  city: string | null;
  area: string | null;

  lat: number | null;
  lng: number | null;
  deliveryRadiusKm: number | null;

  approvalStatus: ApprovalStatus;
  isActive: boolean;
};

type ProfileSearchResult = {
  profileId: string;
  authUserId: string | null;
  email: string | null;
  fullName: string;
  role: string;
  phone: string | null;
  existingVendorId: string | null;
};

type VendorRpcRow = {
  vendor_id: string;
  profile_id: string | null;
  auth_user_id: string | null;
  email: string | null;
  contact_email: string | null;  
  profile_full_name: string | null;
  profile_role: string | null;
  vendor_name: string;
  slug: string | null;
  description: string | null;
  image_url: string | null;
  license_number: string | null;
  phone: string | null;
  address_line_1: string | null;
  city: string | null;
  area: string | null;
  lat: number | string | null;
  lng: number | string | null;
  delivery_radius_km: number | string | null;
  approval_status: ApprovalStatus;
  is_active: boolean;
};

type ProfileSearchRpcRow = {
  profile_id: string;
  auth_user_id: string | null;
  email: string | null;
  full_name: string;
  role: string;
  phone: string | null;
  existing_vendor_id: string | null;
};

type VendorFormValues = {
  profileId: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  licenseNumber: string;
  contactEmail: string;
  phone: string;
  addressLine1: string;
  city: string;
  area: string;
  lat: string;
  lng: string;
  deliveryRadiusKm: string;
  approvalStatus: ApprovalStatus;
};

const initialVendorFormValues: VendorFormValues = {
  profileId: "",
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  licenseNumber: "",
  contactEmail: "",
  phone: "",
  addressLine1: "",
  city: "",
  area: "",
  lat: "",
  lng: "",
  deliveryRadiusKm: "15",
  approvalStatus: "pending",
};

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "تعذر إكمال إدارة المتاجر الآن.";
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { value: null, provided: false };
  }

  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    return { value: null, provided: true, error: "يجب أن تكون قيم خط العرض والطول أرقامًا صحيحة." };
  }

  return { value: parsed, provided: true };
}

function getVendorActivationForApproval(approvalStatus: ApprovalStatus) {
  return approvalStatus === "approved";
}

function slugifyVendorName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildVendorFormValues(vendor?: VendorRow | null): VendorFormValues {
  if (!vendor) {
    return initialVendorFormValues;
  }

  return {
    profileId: vendor.profileId ?? "",
    name: vendor.vendorName,
    slug: vendor.slug ?? "",
    description: vendor.description ?? "",
    imageUrl: vendor.imageUrl ?? "",
    licenseNumber: vendor.licenseNumber ?? "",
    contactEmail: vendor.contactEmail ?? "",
    phone: vendor.phone ?? "",
    addressLine1: vendor.addressLine1 ?? "",
    city: vendor.city ?? "",
    area: vendor.area ?? "",
    lat: vendor.lat == null ? "" : String(vendor.lat),
    lng: vendor.lng == null ? "" : String(vendor.lng),
    deliveryRadiusKm: vendor.deliveryRadiusKm == null ? "15" : String(vendor.deliveryRadiusKm),
    approvalStatus: vendor.approvalStatus,
  };
}

function validateVendorForm(values: VendorFormValues) {
  if (values.profileId.trim() === "" && values.approvalStatus === "approved" && !values.contactEmail.trim()) {
  return { error: "أدخل بريدًا إلكترونيًا للتواصل عند إنشاء متجر غير مرتبط بحساب دخول." };
}

  if (!values.name.trim() || !values.slug.trim() || !values.phone.trim() || !values.addressLine1.trim() || !values.city.trim() || !values.area.trim()) {
    return { error: "يرجى إكمال جميع الحقول المطلوبة للمتجر." };
  }

  const lat = parseOptionalNumber(values.lat);
  if (lat.error) {
    return { error: lat.error };
  }

  const lng = parseOptionalNumber(values.lng);
  if (lng.error) {
    return { error: lng.error };
  }
  const deliveryRadius = parseOptionalNumber(values.deliveryRadiusKm);
if (deliveryRadius.error) {
  return { error: "قيمة نطاق التوصيل غير صحيحة." };
}

  return {
    error: null,
    payload: {
      profileId: values.profileId.trim() || null,
      name: values.name.trim(),
      slug: values.slug.trim(),
      description: values.description.trim(),
      imageUrl: values.imageUrl.trim(),
      licenseNumber: values.licenseNumber.trim(),
      contactEmail: values.contactEmail.trim(),
      phone: values.phone.trim(),
      addressLine1: values.addressLine1.trim(),
      city: values.city.trim(),
      area: values.area.trim(),
      lat: lat.value,
      lng: lng.value,
      deliveryRadiusKm: deliveryRadius.value ?? 15,
      setLat: lat.provided,
      setLng: lng.provided,
      approvalStatus: values.approvalStatus,
      isActive: getVendorActivationForApproval(values.approvalStatus),
    },
  };
}

function mapVendorRow(row: VendorRpcRow): VendorRow {
  return {
    vendorId: String(row.vendor_id),
    profileId: row.profile_id ? String(row.profile_id) : null,
    authUserId: row.auth_user_id ? String(row.auth_user_id) : null,
    email: row.email ?? null,
    contactEmail: row.contact_email ?? null,
    profileFullName: row.profile_full_name ?? "ملف غير مرتبط",
    profileRole: row.profile_role ?? null,
    vendorName: String(row.vendor_name),
    slug: row.slug ?? null,
    description: row.description ?? null,
    imageUrl: row.image_url ?? null,
    licenseNumber: row.license_number ?? null,
    phone: row.phone ?? null,
    addressLine1: row.address_line_1 ?? null,
    city: row.city ?? null,
    area: row.area ?? null,
    lat: row.lat == null ? null : Number(row.lat),
    lng: row.lng == null ? null : Number(row.lng),
    deliveryRadiusKm: row.delivery_radius_km == null ? null : Number(row.delivery_radius_km),
    approvalStatus: row.approval_status,
    isActive: row.is_active,
  };
}

function mapProfileSearchRow(row: ProfileSearchRpcRow): ProfileSearchResult {
  return {
    profileId: String(row.profile_id),
    authUserId: row.auth_user_id ? String(row.auth_user_id) : null,
    email: row.email ?? null,
    fullName: String(row.full_name),
    role: String(row.role),
    phone: row.phone ?? null,
    existingVendorId: row.existing_vendor_id ? String(row.existing_vendor_id) : null,
  };
}

async function loadAdminVendors() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("admin_list_vendors");

  if (error) {
    throw error;
  }

  return ((data ?? []) as VendorRpcRow[]).map(mapVendorRow);
}

async function searchAdminProfiles(query: string, role: RoleFilter) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("admin_search_profiles", {
    p_query: query.trim() || null,
    p_role: role || null,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ProfileSearchRpcRow[]).map(mapProfileSearchRow);
}

function SelectedProfileSummary({
  profile,
  editingVendorId,
}: {
  profile: ProfileSearchResult | null;
  editingVendorId: string | null;
}) {
  const { t } = useLocale();

  if (!profile) {
    return <p className="muted">{t("يمكن ربط المتجر بحساب موجود أو تركه كمتجر مبدئي بدون تسجيل دخول.")}</p>;
  }

  const linkedElsewhere = Boolean(profile.existingVendorId && profile.existingVendorId !== editingVendorId);

  return (
    <div className="stack">
      <div className="table-actions">
        <Badge>{profile.fullName}</Badge>
        <Badge>{profile.role}</Badge>
      </div>
      <p className="muted">
        {t("Profile ID")}: {profile.profileId}
      </p>
      <p className="muted">
        {t("Auth User ID")}: {profile.authUserId ?? "-"}
      </p>
      <p className="muted">
        {t("Email")}: {profile.email ?? "-"}
      </p>
      <p className="muted">
        {t("Phone")}: {profile.phone ?? "-"}
      </p>
      {linkedElsewhere ? <p className="danger">{t("This profile is already linked to another vendor.")}</p> : null}
    </div>
  );
}

export function AdminVendorsManager() {
  const { t } = useLocale();
  const [vendorsState, setVendorsState] = useState<AsyncState<VendorRow[]>>({
    data: null,
    error: null,
    loading: true,
  });
  const [profilesState, setProfilesState] = useState<AsyncState<ProfileSearchResult[]>>({
    data: null,
    error: null,
    loading: true,
  });
  const [profileQuery, setProfileQuery] = useState("");
  const [profileRoleFilter, setProfileRoleFilter] = useState<RoleFilter>("");
  const [formValues, setFormValues] = useState<VendorFormValues>(initialVendorFormValues);
  const [selectedProfile, setSelectedProfile] = useState<ProfileSearchResult | null>(null);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingVendorImage, setUploadingVendorImage] = useState(false);
  const [actingVendorId, setActingVendorId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const vendors = vendorsState.data ?? [];

  async function loadVendors() {
    setVendorsState({
      data: null,
      error: null,
      loading: true,
    });

    try {
      const data = await loadAdminVendors();
      setVendorsState({
        data,
        error: null,
        loading: false,
      });
    } catch (error) {
      setVendorsState({
        data: null,
        error: normalizeError(error),
        loading: false,
      });
    }
  }

  async function loadProfiles(query = profileQuery, role = profileRoleFilter) {
    setProfilesState((current) => ({
      data: current.data,
      error: null,
      loading: true,
    }));

    try {
      const data = await searchAdminProfiles(query, role);
      setProfilesState({
        data,
        error: null,
        loading: false,
      });
    } catch (error) {
      setProfilesState({
        data: null,
        error: normalizeError(error),
        loading: false,
      });
    }
  }

  useEffect(() => {
    void loadVendors();
    void loadProfiles("", "");
  }, []);

  function resetForm() {
    setEditingVendorId(null);
    setFormValues(initialVendorFormValues);
    setSelectedProfile(null);
    setFeedback(null);
  }

  function startEditingVendor(vendor: VendorRow) {
    setEditingVendorId(vendor.vendorId);
    setFormValues(buildVendorFormValues(vendor));
      setSelectedProfile({
        profileId: vendor.profileId ?? "",
        authUserId: vendor.authUserId,
        email: vendor.email,
        fullName: vendor.profileFullName,
        role: vendor.profileRole ?? "vendor",
        phone: vendor.phone,
        existingVendorId: vendor.vendorId,
      });
    setFeedback(null);
  }

  async function handleProfileSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadProfiles();
  }

  function chooseProfile(profile: ProfileSearchResult) {
    setSelectedProfile(profile);
    setFormValues((current) => ({
      ...current,
      profileId: profile.profileId,
      phone: current.phone || profile.phone || "",
    }));
  }
async function handleVendorImageUpload(file: File | null) {
  if (!file) {
    return;
  }

  setFeedback(null);

  if (!file.type.startsWith("image/")) {
    setFeedback({
      type: "error",
      message: "يرجى اختيار ملف صورة صالح.",
    });
    return;
  }

  const maxSizeMb = 5;
  if (file.size > maxSizeMb * 1024 * 1024) {
    setFeedback({
      type: "error",
      message: "حجم الصورة يجب ألا يتجاوز 5MB.",
    });
    return;
  }

  const supabase = getSupabaseBrowserClient();
  setUploadingVendorImage(true);

  try {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeName = crypto.randomUUID();
    const path = `vendors/${safeName}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("vendor-images")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from("vendor-images").getPublicUrl(path);

    setFormValues((current) => ({
      ...current,
      imageUrl: data.publicUrl,
    }));

    setFeedback({
      type: "success",
      message: "تم رفع صورة المتجر بنجاح.",
    });
  } catch (error) {
    setFeedback({
      type: "error",
      message: normalizeError(error),
    });
  } finally {
    setUploadingVendorImage(false);
  }
}
  async function handleSaveVendor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const validation = validateVendorForm(formValues);
    if (validation.error || !validation.payload) {
      setFeedback({
        type: "error",
        message: validation.error ?? "يرجى مراجعة نموذج المتجر والمحاولة مرة أخرى.",
      });
      return;
    }

    if (selectedProfile?.existingVendorId && selectedProfile.existingVendorId !== editingVendorId) {
      setFeedback({
        type: "error",
        message: "هذا الملف مرتبط بالفعل بمتجر آخر.",
      });
      return;
    }

    const supabase = getSupabaseBrowserClient();
    setSaving(true);

    try {
      if (editingVendorId) {
        const { error } = await supabase.rpc("admin_update_vendor", {
          p_vendor_id: editingVendorId,
          p_profile_id: validation.payload.profileId,
          p_name: validation.payload.name,
          p_slug: validation.payload.slug,
          p_description: validation.payload.description,
          p_image_url: validation.payload.imageUrl,
          p_license_number: validation.payload.licenseNumber,
          p_contact_email: validation.payload.contactEmail,
          p_phone: validation.payload.phone,
          p_address_line_1: validation.payload.addressLine1,
          p_city: validation.payload.city,
          p_area: validation.payload.area,
          p_lat: validation.payload.lat,
          p_lng: validation.payload.lng,
          p_set_lat: validation.payload.setLat,
          p_set_lng: validation.payload.setLng,
          p_approval_status: validation.payload.approvalStatus,
          p_is_active: validation.payload.isActive,
        });

        if (error) {
          throw error;
        }

        setFeedback({
          type: "success",
          message: "تم تحديث بيانات المتجر بنجاح.",
        });
      } else {
        const { error } = await supabase.rpc("admin_create_vendor", {
          p_profile_id: validation.payload.profileId,
          p_name: validation.payload.name,
          p_slug: validation.payload.slug,
          p_description: validation.payload.description,
          p_image_url: validation.payload.imageUrl,
          p_license_number: validation.payload.licenseNumber,
          p_contact_email: validation.payload.contactEmail,
          p_phone: validation.payload.phone,
          p_address_line_1: validation.payload.addressLine1,
          p_city: validation.payload.city,
          p_area: validation.payload.area,
          p_lat: validation.payload.lat,
          p_lng: validation.payload.lng,
          p_approval_status: validation.payload.approvalStatus,
          p_is_active: validation.payload.isActive,
        });

        if (error) {
          throw error;
        }

        setFeedback({
          type: "success",
          message: "تم إنشاء المتجر بنجاح.",
        });
        setFormValues(initialVendorFormValues);
        setSelectedProfile(null);
      }

      await loadVendors();
      await loadProfiles();

      if (editingVendorId) {
        setEditingVendorId(null);
        setFormValues(initialVendorFormValues);
        setSelectedProfile(null);
      }
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeError(error),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickVendorAction(vendor: VendorRow, approvalStatus: ApprovalStatus, successMessage: string) {
    const supabase = getSupabaseBrowserClient();
setActingVendorId(vendor.vendorId);
setFeedback(null);

try {
  if (!vendor.profileId && approvalStatus === "approved" && !vendor.contactEmail) {
    throw new Error("لا يمكن اعتماد متجر غير مرتبط بدون بريد تواصل.");
  }

      const payload = {
        p_vendor_id: vendor.vendorId,
        p_profile_id: vendor.profileId,
        p_approval_status: approvalStatus,
        p_is_active: getVendorActivationForApproval(approvalStatus),
      };

      const response = await supabase.rpc("admin_update_vendor", payload);

      const { error } = response;

      if (error) {
        throw new Error(
          [
            error.message,
            error.details,
            error.hint,
            error.code,
          ]
            .filter(Boolean)
            .join(" | ") || "admin_update_vendor failed"
        );
      }

      const { data: updatedVendor, error: verifyError } = await supabase
        .from("vendors")
        .select("id, approval_status, is_active")
        .eq("id", vendor.vendorId)
        .maybeSingle();

      if (verifyError) {
        throw verifyError;
      }

      if (updatedVendor?.approval_status !== approvalStatus || Boolean(updatedVendor?.is_active) !== getVendorActivationForApproval(approvalStatus)) {
        throw new Error("لم يتم حفظ حالة اعتماد المتجر في قاعدة البيانات.");
      }

      setFeedback({
        type: "success",
        message: successMessage,
      });
      await loadVendors();
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeError(error),
      });
    } finally {
      setActingVendorId(null);
    }
  }

  if (vendorsState.loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="جارٍ تحميل المتاجر من Supabase..." />
      </Card>
    );
  }

  if (vendorsState.error) {
    return (
      <Card className="medical-panel">
        <ErrorState message={vendorsState.error} onRetry={() => void loadVendors()} />
      </Card>
    );
  }

  const selectedProfileLinkedElsewhere = Boolean(selectedProfile?.existingVendorId && selectedProfile.existingVendorId !== editingVendorId);

  return (
    <div className="stack">
      <Card className="medical-panel">
        <h3>{t(editingVendorId ? "Edit Vendor" : "Create Vendor")}</h3>
        <p className="muted">
          {t(
            editingVendorId
              ? "Update vendor details, relink the profile if needed, and control approval state."
              : "أنشئ متجرًا مرتبطًا بحساب أو متجرًا مبدئيًا بدون تسجيل دخول للصيدليات الجديدة."
          )}
        </p>
        <form className="form-grid" onSubmit={handleProfileSearch}>
          <div className="field">
            <label htmlFor="profile-query">{t("Profile Search")}</label>
            <Input
              id="profile-query"
              value={profileQuery}
              onChange={(event) => setProfileQuery(event.target.value)}
              placeholder="ابحث بواسطة معرّف مستخدم المصادقة أو البريد الإلكتروني أو الاسم الكامل أو الدور"
            />
          </div>
          <div className="field">
            <label htmlFor="profile-role">{t("Role Filter")}</label>
            <select
              id="profile-role"
              className="input"
              value={profileRoleFilter}
              onChange={(event) => setProfileRoleFilter(event.target.value as RoleFilter)}
            >
              <option value="">{t("All roles")}</option>
              <option value="admin">{t("admin")}</option>
              <option value="vendor">{t("vendor")}</option>
              <option value="customer">{t("customer")}</option>
              <option value="driver">{t("driver")}</option>
            </select>
          </div>
          <div className="actions">
            <Button type="submit" loading={profilesState.loading}>
              {profilesState.loading ? "جارٍ البحث..." : "بحث عن الملفات"}
            </Button>
          </div>
        </form>

        {profilesState.error ? <p className="danger">{profilesState.error}</p> : null}
        {profilesState.loading && !profilesState.data ? <LoadingState message="جارٍ تحميل الملفات..." /> : null}
        {!profilesState.loading && (profilesState.data?.length ?? 0) === 0 ? (
          <EmptyState title="لم يتم العثور على ملفات" message="جرّب بحثًا مختلفًا أو أزل فلتر الدور." />
        ) : null}
        {(profilesState.data?.length ?? 0) > 0 ? (
          <Table
            title="نتائج الملفات"
            headers={["الاسم", "البريد الإلكتروني", "الدور", "ربط الملف", "الإجراءات"]}
            rows={(profilesState.data ?? []).map((profile) => [
              `${profile.fullName}${profile.phone ? ` • ${profile.phone}` : ""}`,
              profile.email ?? "-",
              profile.role,
              profile.existingVendorId ? `${t("Linked Vendor")}: ${profile.existingVendorId}` : profile.authUserId ?? "-",
              <div key={`${profile.profileId}-select`} className="table-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => chooseProfile(profile)}
                  disabled={saving}
                >
                  {profile.profileId === selectedProfile?.profileId ? "محدد" : "استخدام الملف"}
                </Button>
              </div>,
            ])}
            emptyMessage="لا توجد ملفات تطابق هذا البحث."
          />
        ) : null}
      </Card>

      <Card className="medical-panel">
        <h3>{t("Linked Profile")}</h3>
        <SelectedProfileSummary profile={selectedProfile} editingVendorId={editingVendorId} />
      </Card>

      <Card className="medical-panel">
        <form className="form-grid" onSubmit={handleSaveVendor}>
          <div className="field">
            <label htmlFor="vendor-name">{t("Vendor Name")}</label>
            <Input
              id="vendor-name"
              value={formValues.name}
              onChange={(event) =>
  setFormValues((current) => {
    const nextName = event.target.value;

    return {
      ...current,
      name: nextName,
      slug:
        current.slug === "" ||
        current.slug === slugifyVendorName(current.name)
          ? slugifyVendorName(nextName)
          : current.slug,
    };
  })
}
              placeholder="صيدلية جرين كير"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="vendor-slug">{t("Slug")}</label>
            <Input
              id="vendor-slug"
              value={formValues.slug}
              onChange={(event) => setFormValues((current) => ({ ...current, slug: event.target.value }))}
              placeholder="greencare-pharmacy"
              required
            />
          </div>
          <div className="field">
  <label htmlFor="vendor-description">{t("Description")}</label>
  <textarea
    id="vendor-description"
    className="textarea"
    rows={4}
    value={formValues.description}
    onChange={(event) =>
      setFormValues((current) => ({
        ...current,
        description: event.target.value,
      }))
    }
    placeholder={t("Short vendor description")}
  />
</div>


<div className="field">
  <label htmlFor="vendor-image-upload">صورة المتجر</label>
  <Input
    id="vendor-image-upload"
    type="file"
    accept="image/*"
    disabled={uploadingVendorImage || saving}
    onChange={(event) => {
      const file = event.target.files?.[0] ?? null;
      void handleVendorImageUpload(file);
      event.target.value = "";
    }}
  />
  <p className="muted">
    {uploadingVendorImage ? "جارٍ رفع الصورة..." : "ارفع صورة للمتجر، وسيتم حفظ الرابط تلقائيًا."}
  </p>
</div>

<div className="field">
  <label htmlFor="vendor-image-url">رابط صورة المتجر</label>
  <Input
    id="vendor-image-url"
    value={formValues.imageUrl}
    onChange={(event) =>
      setFormValues((current) => ({
        ...current,
        imageUrl: event.target.value,
      }))
    }
    placeholder="سيظهر الرابط تلقائيًا بعد رفع الصورة"
  />
</div>

{formValues.imageUrl ? (
  <div className="vendor-image-preview">
    <img
      src={formValues.imageUrl}
      alt="Vendor preview"
      style={{
        width: "100%",
        maxWidth: 220,
        height: 140,
        objectFit: "cover",
        borderRadius: 16,
        border: "1px solid var(--border)",
      }}
    />
  </div>
) : null}
<div className="field">
  <label htmlFor="vendor-license-number">رقم الترخيص</label>
  <Input
    id="vendor-license-number"
    value={formValues.licenseNumber}
    onChange={(event) =>
      setFormValues((current) => ({
        ...current,
        licenseNumber: event.target.value,
      }))
    }
    placeholder="اختياري"
  />
</div>
<div className="field">
  <label htmlFor="vendor-contact-email">البريد الإلكتروني للتواصل</label>
  <Input
    id="vendor-contact-email"
    value={formValues.contactEmail}
    onChange={(event) =>
      setFormValues((current) => ({
        ...current,
        contactEmail: event.target.value,
      }))
    }
    placeholder="pharmacy@example.com"
  />
</div>

<div className="field">
            <label htmlFor="vendor-phone">{t("Phone")}</label>
            <Input
              id="vendor-phone"
              value={formValues.phone}
              onChange={(event) => setFormValues((current) => ({ ...current, phone: event.target.value }))}
              placeholder="+9665..."
              required
            />
          </div>
          <div className="field">
            <label htmlFor="vendor-address">{t("Address Line 1")}</label>
            <Input
              id="vendor-address"
              value={formValues.addressLine1}
              onChange={(event) => setFormValues((current) => ({ ...current, addressLine1: event.target.value }))}
              placeholder="14 King Street"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="vendor-city">{t("City")}</label>
            <Input
              id="vendor-city"
              value={formValues.city}
              onChange={(event) => setFormValues((current) => ({ ...current, city: event.target.value }))}
              placeholder="الرياض"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="vendor-area">{t("Area")}</label>
            <Input
              id="vendor-area"
              value={formValues.area}
              onChange={(event) => setFormValues((current) => ({ ...current, area: event.target.value }))}
              placeholder="الحي المركزي"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="vendor-lat">{t("Latitude")}</label>
            <Input
              id="vendor-lat"
              value={formValues.lat}
              onChange={(event) => setFormValues((current) => ({ ...current, lat: event.target.value }))}
              placeholder="24.7136"
            />
          </div>
          <div className="field">
            <label htmlFor="vendor-lng">{t("Longitude")}</label>
            <Input
              id="vendor-lng"
              value={formValues.lng}
              onChange={(event) => setFormValues((current) => ({ ...current, lng: event.target.value }))}
              placeholder="46.6753"
            />
          </div>
          <p className="muted">
  يمكن نسخ الإحداثيات مباشرة من Google Maps.
</p>

<div className="field">
  <label htmlFor="vendor-delivery-radius">نطاق التوصيل (كم)</label>
  <Input
    id="vendor-delivery-radius"
    value={formValues.deliveryRadiusKm}
    onChange={(event) =>
      setFormValues((current) => ({
        ...current,
        deliveryRadiusKm: event.target.value,
      }))
    }
    placeholder="15"
  />
  <p className="muted">الحد الأقصى لمسافة التوصيل بالكيلومتر.</p>
</div>
          <div className="field">
            <label htmlFor="vendor-approval">{t("Approval Status")}</label>
            <select
              id="vendor-approval"
              className="input"
              value={formValues.approvalStatus}
              onChange={(event) =>
                setFormValues((current) => ({ ...current, approvalStatus: event.target.value as ApprovalStatus }))
              }
            >
              <option value="pending">{t("pending")}</option>
              <option value="approved">{t("approved")}</option>
              <option value="rejected">{t("rejected")}</option>
            </select>
          </div>
          {feedback ? <p className={feedback.type === "error" ? "danger" : "success"}>{t(feedback.message)}</p> : null}
          {selectedProfileLinkedElsewhere ? <p className="danger">{t("This profile is already linked to another vendor.")}</p> : null}

<div className="actions">
  <Button
    type="submit"
    disabled={selectedProfileLinkedElsewhere || uploadingVendorImage}
    loading={saving || uploadingVendorImage}
  >
    {saving || uploadingVendorImage
      ? "جارٍ الحفظ..."
      : editingVendorId
        ? "حفظ تعديلات المتجر"
        : "حفظ المتجر"}
  </Button>

  {editingVendorId ? (
    <Button
      type="button"
      variant="secondary"
      onClick={resetForm}
      disabled={saving || uploadingVendorImage}
    >
      إلغاء التعديل
    </Button>
  ) : null}
</div>        </form>
      </Card>

      {vendors.length === 0 ? (
        <Card className="medical-panel">
          <EmptyState title="لا توجد متاجر بعد" message="أنشئ أول متجر لتفعيل إدارة الصيدليات داخل لوحة التحكم." />
        </Card>
      ) : (
        <Table
          title="المتاجر"
          headers={[
  "المتجر",
  "المالك",
  "الهاتف",
  "العنوان",
  "الترخيص",
  "الحالة",
  "الإجراءات",
]}
          rows={vendors.map((vendor) => [
  `${vendor.vendorName}${vendor.slug ? ` • ${vendor.slug}` : ""}`,

  [
  vendor.profileFullName,
  vendor.email,
  vendor.contactEmail,
]
  .filter(Boolean)
  .join(" • "),

  vendor.phone ?? "-",

[
  vendor.addressLine1,
  vendor.city,
  vendor.area,
  vendor.deliveryRadiusKm
    ? `${vendor.deliveryRadiusKm} كم`
    : null,
]
  .filter(Boolean)
  .join(" • ") || "-",

  vendor.licenseNumber || "-",

  <div className="table-actions">
  <Badge
    className={
      vendor.approvalStatus === "approved"
        ? "success"
        : vendor.approvalStatus === "rejected"
          ? "danger"
          : "warning"
    }
  >
    {vendor.approvalStatus === "approved"
      ? "معتمد"
      : vendor.approvalStatus === "rejected"
        ? "مرفوض"
        : "قيد المراجعة"}
  </Badge>

  {vendor.isActive ? (
    <Badge className="success">نشط</Badge>
  ) : (
    <Badge className="muted">غير نشط</Badge>
  )}
</div>,

            <div key={`${vendor.vendorId}-actions`} className="table-actions">
              <Button type="button" variant="secondary" onClick={() => startEditingVendor(vendor)} disabled={saving || actingVendorId === vendor.vendorId}>
                تعديل
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  void handleQuickVendorAction(vendor, "approved", "تم اعتماد المتجر وتفعيله بنجاح.")
                }
                disabled={saving || actingVendorId === vendor.vendorId}
              >
                اعتماد
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() =>
                  void handleQuickVendorAction(vendor, "rejected", "تم رفض المتجر وتعطيله بنجاح.")
                }
                disabled={saving || actingVendorId === vendor.vendorId}
              >
                {actingVendorId === vendor.vendorId ? "جارٍ الحفظ..." : "رفض"}
              </Button>
            </div>,
          ])}
          emptyMessage="لم تتم إضافة أي متاجر بعد."
        />
      )}
    </div>
  );
}

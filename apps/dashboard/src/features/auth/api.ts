"use client";

import { fetchProfileRole } from "@medifast/supabase";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";

type AuthFailure = {
  message: string;
  name: string;
  status: number;
};

type DashboardRole = "admin" | "vendor" | "customer" | "driver";

type VendorAccessState = {
  approvalStatus: string | null;
  isActive: boolean;
  error: Error | null;
};

export type VendorRegistrationInput = {
  email: string;
  password: string;
  fullName: string;
  vendorName: string;
  slug: string;
  phone: string;
  addressLine1: string;
  city: string;
  area: string;

  description: string;

  imageUrl: string;
  licenseNumber: string;
};

export interface DashboardProfile {
  id: string;
  role: DashboardRole;
  full_name: string;
}

export function isDashboardSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function signInDashboardUser(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();

  let authResponse: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;

  try {
    authResponse = await supabase.auth.signInWithPassword({
      email,
      password,
    });
  } catch (error) {
    const authError = createAuthFailure(error);

    return {
      authResponse: {
        data: {
          user: null,
          session: null,
        },
        error: authError,
      } as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>,
      role: null,
      profileError: authError,
      vendorAccess: null,
    };
  }

  if (authResponse.error || !authResponse.data.user) {
    return {
      authResponse,
      role: null,
      profileError: authResponse.error,
      vendorAccess: null,
    };
  }

  let profileResponse = await fetchProfileRole(supabase, authResponse.data.user.id);

  if (!profileResponse.data?.role && authResponse.data.user.user_metadata?.role === "vendor") {
    const vendorResponse = await completePendingVendorRegistration(authResponse.data.user.user_metadata);

    if (vendorResponse.error) {
      return {
        authResponse,
        role: null,
        profileError: vendorResponse.error,
        vendorAccess: null,
      };
    }

    profileResponse = await fetchProfileRole(supabase, authResponse.data.user.id);
  }

  const role = profileResponse.data?.role ?? null;
  const vendorAccess = role === "vendor" ? await getVendorAccessState() : null;

  return {
    authResponse,
    role,
    profileError: profileResponse.error,
    vendorAccess,
  };
}

export async function signUpVendorDashboardUser(input: VendorRegistrationInput) {
  const supabase = getSupabaseBrowserClient();

  const authResponse = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: createVendorUserMetadata(input),
    },
  });

  if (authResponse.error || !authResponse.data.user) {
    return {
      authResponse,
      vendorResponse: null,
    };
  }

  if (!authResponse.data.session) {
    return {
      authResponse,
      vendorResponse: null,
    };
  }

  const vendorResponse = await registerVendorAccount(input);

  return {
    authResponse,
    vendorResponse,
  };
}

async function completePendingVendorRegistration(metadata: Record<string, unknown>) {
  return registerVendorAccount({
    email: "",
    password: "",
    fullName: readMetadataString(metadata, "full_name"),
    vendorName: readMetadataString(metadata, "vendor_name"),
    slug: readMetadataString(metadata, "vendor_slug"),
    phone: readMetadataString(metadata, "phone"),
    addressLine1: readMetadataString(metadata, "address_line_1"),
    city: readMetadataString(metadata, "city"),
    area: readMetadataString(metadata, "area"),

    description: readMetadataString(metadata, "description"),

    imageUrl: readMetadataString(metadata, "image_url"),
    licenseNumber: readMetadataString(metadata, "license_number"),
  });
}

async function registerVendorAccount(input: VendorRegistrationInput) {
  const supabase = getSupabaseBrowserClient();

  return supabase.rpc("register_vendor_account", {
    p_full_name: cleanRequired(input.fullName),
    p_vendor_name: cleanRequired(input.vendorName),
    p_slug: cleanRequired(input.slug),

    p_phone: cleanRequired(input.phone),
    p_address_line_1: cleanRequired(input.addressLine1),
    p_city: cleanRequired(input.city),
    p_area: cleanRequired(input.area),

    p_description: cleanOptional(input.description),

    p_image_url: cleanOptional(input.imageUrl),
    p_license_number: cleanOptional(input.licenseNumber),
  });
}

async function getVendorAccessState(): Promise<VendorAccessState> {
  const supabase = getSupabaseBrowserClient();
  const { data: vendorId, error: vendorIdError } = await supabase.rpc("get_vendor_id");

  if (vendorIdError) {
    return {
      approvalStatus: null,
      isActive: false,
      error: vendorIdError,
    };
  }

  if (!vendorId) {
    return {
      approvalStatus: null,
      isActive: false,
      error: new Error("هذا الحساب غير مرتبط بمتجر بعد. يرجى التواصل مع الإدارة."),
    };
  }

  const { data, error } = await supabase
    .from("vendors")
    .select("approval_status, is_active")
    .eq("id", String(vendorId))
    .maybeSingle();

  return {
    approvalStatus: data?.approval_status ? String(data.approval_status) : null,
    isActive: Boolean(data?.is_active),
    error: error ?? null,
  };
}

export async function signOutDashboardUser() {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signOut();
}

function createVendorUserMetadata(input: VendorRegistrationInput) {
  return {
    role: "vendor",

    full_name: cleanRequired(input.fullName),

    vendor_name: cleanRequired(input.vendorName),
    vendor_slug: cleanRequired(input.slug),

    phone: cleanRequired(input.phone),

    address_line_1: cleanRequired(input.addressLine1),
    city: cleanRequired(input.city),
    area: cleanRequired(input.area),

    description: cleanOptional(input.description),

    image_url: cleanOptional(input.imageUrl),
    license_number: cleanOptional(input.licenseNumber),
  };
}

function cleanRequired(value: string) {
  return value.trim();
}

function cleanOptional(value: string) {
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function readMetadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" ? value : "";
}

function createAuthFailure(error: unknown): AuthFailure {
  return {
    name: "AuthRetryableFetchError",
    message:
      error instanceof Error
        ? error.message
        : "Unable to reach Supabase. Check your URL, anon key, and network connection.",
    status: 0,
  };
}
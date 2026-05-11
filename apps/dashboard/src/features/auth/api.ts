"use client";

import { fetchProfileRole } from "@medifast/supabase";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";

type AuthFailure = {
  message: string;
  name: string;
  status: number;
};

type VendorAccessState = {
  approvalStatus: string | null;
  isActive: boolean;
  error: Error | null;
};

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
    const message = error instanceof Error ? error.message : "Unable to reach Supabase. Check your URL, anon key, and network connection.";
    const authError: AuthFailure = {
      name: "AuthRetryableFetchError",
      message,
      status: 0,
    };

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
    const vendorResponse = await registerVendorAccount({
      fullName: String(authResponse.data.user.user_metadata.full_name ?? ""),
      vendorName: String(authResponse.data.user.user_metadata.vendor_name ?? ""),
      slug: String(authResponse.data.user.user_metadata.vendor_slug ?? ""),
      phone: String(authResponse.data.user.user_metadata.phone ?? ""),
      addressLine1: String(authResponse.data.user.user_metadata.address_line_1 ?? ""),
      city: String(authResponse.data.user.user_metadata.city ?? ""),
      area: String(authResponse.data.user.user_metadata.area ?? ""),
      description: String(authResponse.data.user.user_metadata.description ?? ""),
    });

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

export async function signUpVendorDashboardUser(input: {
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
}) {
  const supabase = getSupabaseBrowserClient();

  const authResponse = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        role: "vendor",
        full_name: input.fullName,
        vendor_name: input.vendorName,
        vendor_slug: input.slug,
        phone: input.phone,
        address_line_1: input.addressLine1,
        city: input.city,
        area: input.area,
        description: input.description,
      },
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

async function registerVendorAccount(input: {
  fullName: string;
  vendorName: string;
  slug: string;
  phone: string;
  addressLine1: string;
  city: string;
  area: string;
  description: string;
}) {
  const supabase = getSupabaseBrowserClient();

  return supabase.rpc("register_vendor_account", {
    p_full_name: input.fullName,
    p_vendor_name: input.vendorName,
    p_slug: input.slug,
    p_phone: input.phone || null,
    p_address_line_1: input.addressLine1 || null,
    p_city: input.city || null,
    p_area: input.area || null,
    p_description: input.description || null,
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

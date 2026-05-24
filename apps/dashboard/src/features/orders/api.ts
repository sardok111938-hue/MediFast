import { getSupabaseServerClient } from "../../lib/supabase/server";
import type {
  PrescriptionQuoteItemAvailability,
  PrescriptionQuoteStatus,
} from "@medifast/types";

type OrderStatusMutationResult = {
  id: string;
  order_status: string;
};

type DriverAssignmentMutationResult = {
  id: string;
  driver_id: string | null;
  order_status: string;
};

export async function updateAdminOrderStatus(orderId: string, nextStatus: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("admin_update_order_status", {
      p_order_id: orderId,
      p_next_status: nextStatus,
    })
    .single();

  return {
    data: data
      ? {
          id: String((data as { order_id: string }).order_id),
          order_status: String((data as { order_status: string }).order_status),
        }
      : null,
    error: error ?? (!data ? new Error("Order status could not be updated.") : null),
  };
}

export async function updateVendorOrderStatus(orderId: string, nextStatus: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("vendor_update_order_status", {
      p_order_id: orderId,
      p_next_status: nextStatus,
    })
    .single();

  return {
    data: data
      ? {
          id: String((data as { order_id: string }).order_id),
          order_status: String((data as { order_status: string }).order_status),
        }
      : null,
    error: error ?? (!data ? new Error("Order status could not be updated.") : null),
  };
}

export async function updateDriverOrderStatus(orderId: string, nextStatus: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("driver_update_order_status", {
      p_order_id: orderId,
      p_next_status: nextStatus,
    })
    .single();

  return {
    data: data
      ? {
          id: String((data as { order_id: string }).order_id),
          order_status: String((data as { order_status: string }).order_status),
        }
      : null,
    error: error ?? (!data ? new Error("Order status could not be updated.") : null),
  };
}

export async function assignDriver(orderId: string, driverId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("admin_assign_driver", {
      p_order_id: orderId,
      p_driver_id: driverId,
    })
    .single();

  return {
    data: data
      ? {
          id: String((data as { order_id: string }).order_id),
          driver_id: (data as { driver_id?: string | null }).driver_id ? String((data as { driver_id: string }).driver_id) : null,
          order_status: String((data as { order_status: string }).order_status),
        }
      : null,
    error: error ?? (!data ? new Error("This order is no longer ready for driver assignment.") : null),
  };
}

export type VendorPrescriptionRequestRow = {
  id: string;
  customer_id: string;
  vendor_id: string;
  address_id: string;
  image_path: string;
  note: string | null;
  vendor_note: string | null;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  signedImageUrl: string | null;
  addressLine: string;
  customerName: string;
  customerPhone: string;
};

export type VendorPrescriptionQuoteItemRow = {
  id: string;
  quote_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  availability_status: PrescriptionQuoteItemAvailability;
  note: string | null;
  created_at: string;
};

export type VendorPrescriptionQuoteRow = {
  id: string;
  prescription_request_id: string;
  vendor_id: string;
  customer_id: string;
  status: PrescriptionQuoteStatus;
  vendor_note: string | null;
  customer_note: string | null;
  subtotal: number;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  items: VendorPrescriptionQuoteItemRow[];
};

export type VendorQuoteProductOption = {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
};

type PrescriptionRequestQueryRow = {
  id: string;
  customer_id: string;
  vendor_id: string;
  address_id: string;
  image_path: string;
  note: string | null;
  vendor_note: string | null;
  status: "pending" | "accepted" | "rejected" | "cancelled";
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  addresses?: { line_1?: string | null } | { line_1?: string | null }[] | null;
  customers?:
    | {
        profiles?:
          | { full_name?: string | null; phone?: string | null }
          | { full_name?: string | null; phone?: string | null }[]
          | null;
      }
    | {
        profiles?:
          | { full_name?: string | null; phone?: string | null }
          | { full_name?: string | null; phone?: string | null }[]
          | null;
      }[]
    | null;
};

type PrescriptionQuoteQueryRow = {
  id: string;
  prescription_request_id: string;
  vendor_id: string;
  customer_id: string;
  status: PrescriptionQuoteStatus;
  vendor_note: string | null;
  customer_note: string | null;
  subtotal: number | string;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  items?: PrescriptionQuoteItemQueryRow[] | null;
};

type PrescriptionQuoteItemQueryRow = {
  id: string;
  quote_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number | string;
  unit_price: number | string;
  line_total: number | string;
  availability_status: PrescriptionQuoteItemAvailability;
  note: string | null;
  created_at: string;
};

const defaultPrescriptionVendorNotes = {
  accepted: "تم قبول الوصفة، سيتم التواصل معك لتأكيد الأدوية المتوفرة.",
  rejected: "تم رفض الوصفة. يرجى التواصل مع الصيدلية أو اختيار صيدلية أخرى.",
} as const;

function readPrescriptionAddressLine(address: PrescriptionRequestQueryRow["addresses"]) {
  if (Array.isArray(address)) {
    return address[0]?.line_1?.trim() || "عنوان غير متوفر";
  }

  return address?.line_1?.trim() || "عنوان غير متوفر";
}

function readPrescriptionCustomer(
  customer: PrescriptionRequestQueryRow["customers"]
) {
  const customerRow = Array.isArray(customer) ? customer[0] : customer;
  const profile = Array.isArray(customerRow?.profiles)
    ? customerRow?.profiles[0]
    : customerRow?.profiles;

  return {
    customerName: profile?.full_name?.trim() || "عميل غير معروف",
    customerPhone: profile?.phone?.trim() || "رقم غير متوفر",
  };
}

function mapPrescriptionQuoteItem(
  item: PrescriptionQuoteItemQueryRow
): VendorPrescriptionQuoteItemRow {
  return {
    id: item.id,
    quote_id: item.quote_id,
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: Number(item.quantity ?? 0),
    unit_price: Number(item.unit_price ?? 0),
    line_total: Number(item.line_total ?? 0),
    availability_status: item.availability_status,
    note: item.note,
    created_at: item.created_at,
  };
}

function mapPrescriptionQuote(
  quote: PrescriptionQuoteQueryRow
): VendorPrescriptionQuoteRow {
  return {
    id: quote.id,
    prescription_request_id: quote.prescription_request_id,
    vendor_id: quote.vendor_id,
    customer_id: quote.customer_id,
    status: quote.status,
    vendor_note: quote.vendor_note,
    customer_note: quote.customer_note,
    subtotal: Number(quote.subtotal ?? 0),
    created_at: quote.created_at,
    updated_at: quote.updated_at,
    accepted_at: quote.accepted_at,
    items: (quote.items ?? []).map((item) => mapPrescriptionQuoteItem(item)),
  };
}

export async function listVendorPrescriptionRequests(): Promise<{
  data: VendorPrescriptionRequestRow[];
  error: Error | null;
}> {
  const supabase = await getSupabaseServerClient();

const { data: vendorIdData } = await supabase
  .rpc("get_vendor_id")
  .single();

const vendorId =
  vendorIdData && typeof vendorIdData === "string"
    ? vendorIdData
    : null;

if (!vendorId) {
  return {
    data: [],
    error: new Error("Vendor account not found."),
  };
}

const { data, error } = await supabase
  .from("prescription_requests")
  .select(`
  id,
  customer_id,
  vendor_id,
  address_id,
  image_path,
  note,
  vendor_note,
  status,
  created_at,
  updated_at,
  responded_at,
  addresses (
    line_1
  ),
  customers (
    profiles (
      full_name,
      phone
    )
  )
`)
  .eq("vendor_id", vendorId)
  .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error };
  }

  const rows = (data ?? []) as PrescriptionRequestQueryRow[];

const mappedRows = rows.map((row) => {
  const customer = readPrescriptionCustomer(row.customers);

  return {
    id: row.id,
    customer_id: row.customer_id,
    vendor_id: row.vendor_id,
    address_id: row.address_id,
    image_path: row.image_path,
    note: row.note,
    vendor_note: row.vendor_note,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    responded_at: row.responded_at,
    signedImageUrl: null,
    addressLine: readPrescriptionAddressLine(row.addresses),
    customerName: customer.customerName,
    customerPhone: customer.customerPhone,
  };
});

  return {
    data: mappedRows,
    error: null,
  };
}

export async function getVendorPrescriptionRequest(requestId: string): Promise<{
  data: VendorPrescriptionRequestRow | null;
  error: Error | null;
}> {
  const supabase = await getSupabaseServerClient();

  const { data: vendorIdData } = await supabase
    .rpc("get_vendor_id")
    .single();

  const vendorId =
    vendorIdData && typeof vendorIdData === "string"
      ? vendorIdData
      : null;

  if (!vendorId) {
    return {
      data: null,
      error: new Error("Vendor account not found."),
    };
  }

  const { data, error } = await supabase
    .from("prescription_requests")
    .select(`
      id,
      customer_id,
      vendor_id,
      address_id,
      image_path,
      note,
      vendor_note,
      status,
      created_at,
      updated_at,
      responded_at,
      addresses (
        line_1
      ),
      customers (
        profiles (
          full_name,
          phone
        )
      )
    `)
    .eq("id", requestId)
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (error || !data) {
    return {
      data: null,
      error: error ?? new Error("Prescription request not found."),
    };
  }

  const row = data as PrescriptionRequestQueryRow;

  const { data: signedUrlData } = await supabase.storage
    .from("prescriptions")
    .createSignedUrl(row.image_path, 60 * 10);

  const customer = readPrescriptionCustomer(row.customers);

  return {
    data: {
      id: row.id,
      customer_id: row.customer_id,
      vendor_id: row.vendor_id,
      address_id: row.address_id,
      image_path: row.image_path,
      note: row.note,
      vendor_note: row.vendor_note,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      responded_at: row.responded_at,
      signedImageUrl: signedUrlData?.signedUrl ?? null,
      addressLine: readPrescriptionAddressLine(row.addresses),
      customerName: customer.customerName,
      customerPhone: customer.customerPhone,
    },
    error: null,
  };
}

export async function getVendorPrescriptionQuoteForRequest(
  requestId: string
): Promise<{
  data: VendorPrescriptionQuoteRow | null;
  error: Error | null;
}> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("prescription_quotes")
    .select(`
      id,
      prescription_request_id,
      vendor_id,
      customer_id,
      status,
      vendor_note,
      customer_note,
      subtotal,
      created_at,
      updated_at,
      accepted_at,
      items:prescription_quote_items (
        id,
        quote_id,
        product_id,
        product_name,
        quantity,
        unit_price,
        line_total,
        availability_status,
        note,
        created_at
      )
    `)
    .eq("prescription_request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  return {
    data: data ? mapPrescriptionQuote(data as PrescriptionQuoteQueryRow) : null,
    error: null,
  };
}

export async function listVendorQuoteProductOptions(): Promise<{
  data: VendorQuoteProductOption[];
  error: Error | null;
}> {
  const supabase = await getSupabaseServerClient();
  const { data: vendorIdData } = await supabase.rpc("get_vendor_id").single();
  const vendorId = vendorIdData && typeof vendorIdData === "string" ? vendorIdData : null;

  if (!vendorId) {
    return {
      data: [],
      error: new Error("Vendor account not found."),
    };
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, name, price, stock_quantity")
    .eq("vendor_id", vendorId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    return { data: [], error };
  }

  return {
    data: (data ?? []).map((product) => ({
      id: String(product.id),
      name: String(product.name),
      price: Number(product.price ?? 0),
      stock_quantity: Number(product.stock_quantity ?? 0),
    })),
    error: null,
  };
}

export async function respondVendorPrescriptionRequest(
  requestId: string,
  nextStatus: "accepted" | "rejected"
) {
  const supabase = await getSupabaseServerClient();
  const { data: existingRequest, error: existingRequestError } = await supabase
    .from("prescription_requests")
    .select("vendor_note")
    .eq("id", requestId)
    .maybeSingle<{ vendor_note: string | null }>();

  if (existingRequestError) {
    return {
      data: null,
      error: existingRequestError,
    };
  }

  const { data, error } = await supabase
    .rpc("vendor_respond_prescription_request", {
      p_request_id: requestId,
      p_status: nextStatus,
    })
    .single();

  const response = {
    data: data ? (data as VendorPrescriptionRequestRow) : null,
    error: error ?? (!data ? new Error("Prescription request could not be updated.") : null),
  };

  if (response.error) {
    return response;
  }

  if (!existingRequest?.vendor_note?.trim()) {
    const { error: noteError } = await supabase.rpc("vendor_update_prescription_note", {
      p_request_id: requestId,
      p_vendor_note: defaultPrescriptionVendorNotes[nextStatus],
    });

    if (noteError) {
      return {
        data: response.data,
        error: noteError,
      };
    }
  }

  return response;
}

export async function updateVendorPrescriptionRequestNote(
  requestId: string,
  vendorNote: string
) {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .rpc("vendor_update_prescription_note", {
      p_request_id: requestId,
      p_vendor_note: vendorNote,
    })
    .single();

  return {
    data: data
      ? {
          id: String((data as { request_id: string }).request_id),
          vendor_note: (data as { vendor_note?: string | null }).vendor_note ?? null,
        }
      : null,
    error: error ?? (!data ? new Error("Prescription note could not be updated.") : null),
  };
}

export async function createVendorPrescriptionQuote(requestId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("vendor_create_prescription_quote", {
    p_prescription_request_id: requestId,
  });

  return {
    data: data ? mapPrescriptionQuote(data as PrescriptionQuoteQueryRow) : null,
    error: error ?? (!data ? new Error("Prescription quote could not be created.") : null),
  };
}

export async function upsertVendorPrescriptionQuoteItem(input: {
  quoteId: string;
  itemId?: string | null;
  productId?: string | null;
  productName?: string | null;
  quantity: number;
  unitPrice?: number | null;
  availabilityStatus: PrescriptionQuoteItemAvailability;
  note?: string | null;
}) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("vendor_upsert_prescription_quote_item", {
    p_quote_id: input.quoteId,
    p_item_id: input.itemId ?? null,
    p_product_id: input.productId ?? null,
    p_product_name: input.productName ?? "",
    p_quantity: input.quantity,
    p_unit_price: input.unitPrice ?? null,
    p_availability_status: input.availabilityStatus,
    p_note: input.note ?? "",
  });

  return {
data: data ? mapPrescriptionQuoteItem(data as PrescriptionQuoteItemQueryRow) : null,
    error: error ?? (!data ? new Error("Prescription quote item could not be saved.") : null),
  };
}

export async function deleteVendorPrescriptionQuoteItem(itemId: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("vendor_delete_prescription_quote_item", {
  p_item_id: itemId,
});

return {
  error,
};
}

export async function sendVendorPrescriptionQuote(
  quoteId: string,
  vendorNote?: string
) {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase.rpc("vendor_send_prescription_quote", {
    p_quote_id: quoteId,
    p_vendor_note: vendorNote ?? "",
  });

  return {
    data: data ? mapPrescriptionQuote(data as PrescriptionQuoteQueryRow) : null,
    error: error ?? (!data ? new Error("Prescription quote could not be sent.") : null),
  };
}
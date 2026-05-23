import { storageBuckets } from "@medifast/supabase";
import type {
  PrescriptionQuoteItemAvailability,
  PrescriptionQuoteStatus,
  PrescriptionRequest,
} from "@medifast/types";
import { supabase } from "./supabase";

type SingleRecord<T extends Record<string, unknown>> = T | T[] | null | undefined;

type CustomerPrescriptionRequestQueryRow = {
  id: string;
  vendor_id: string;
  note: string | null;
  vendor_note: string | null;
  status: PrescriptionRequest["status"];
  created_at: string;
  responded_at: string | null;
  vendor?: SingleRecord<{ name?: string | null }>;
  quotes?: CustomerPrescriptionQuoteQueryRow[] | null;
};

type CustomerPrescriptionQuoteQueryRow = {
  id: string;
  status: PrescriptionQuoteStatus;
  vendor_note: string | null;
  customer_note: string | null;
  subtotal: number | string;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
  converted_order_id: string | null;
  converted_to_order_at: string | null;
  items?: CustomerPrescriptionQuoteItemQueryRow[] | null;
};

type CustomerPrescriptionQuoteItemQueryRow = {
  id: string;
  product_name: string;
  quantity: number | string;
  unit_price: number | string;
  line_total: number | string;
  availability_status: PrescriptionQuoteItemAvailability;
  note: string | null;
};

export type CustomerPrescriptionRequest = {
  id: string;
  vendorId: string;
  vendorName: string;
  note: string | null;
  vendorNote: string | null;
  status: PrescriptionRequest["status"];
  createdAt: string;
  respondedAt: string | null;
  quote: CustomerPrescriptionQuote | null;
};

export type CustomerPrescriptionQuote = {
  id: string;
  status: PrescriptionQuoteStatus;
  vendorNote: string | null;
  customerNote: string | null;
  subtotal: number;
  createdAt: string;
  updatedAt: string;
  acceptedAt: string | null;
  convertedOrderId: string | null;
  convertedToOrderAt: string | null;
  items: CustomerPrescriptionQuoteItem[];
};

export type CustomerPrescriptionQuoteItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  availabilityStatus: PrescriptionQuoteItemAvailability;
  note: string | null;
};

function readSingle<T extends Record<string, unknown>>(value: SingleRecord<T>) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function mapCustomerPrescriptionQuote(
  quote: CustomerPrescriptionQuoteQueryRow
): CustomerPrescriptionQuote {
  return {
    id: quote.id,
    status: quote.status,
    vendorNote: quote.vendor_note,
    customerNote: quote.customer_note,
    subtotal: Number(quote.subtotal ?? 0),
    createdAt: quote.created_at,
    updatedAt: quote.updated_at,
    acceptedAt: quote.accepted_at,
    convertedOrderId: quote.converted_order_id,
    convertedToOrderAt: quote.converted_to_order_at,
    items: (quote.items ?? []).map((item) => ({
      id: item.id,
      productName: item.product_name,
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unit_price ?? 0),
      lineTotal: Number(item.line_total ?? 0),
      availabilityStatus: item.availability_status,
      note: item.note,
    })),
  };
}

function getImageExtension(imageUri: string) {
  const cleanUri = imageUri.split("?")[0] ?? imageUri;
  const extension = cleanUri.split(".").pop()?.toLowerCase();

  if (extension === "png" || extension === "webp" || extension === "jpg" || extension === "jpeg") {
    return extension;
  }

  return "jpg";
}

function getImageContentType(extension: string) {
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
}

export async function uploadPrescriptionImage(input: {
  customerId: string;
  requestId: string;
  imageUri: string;
}) {
  const extension = getImageExtension(input.imageUri);
  const imagePath = `${input.customerId}/${input.requestId}.${extension}`;

  const response = await fetch(input.imageUri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage
    .from(storageBuckets.prescriptions)
    .upload(imagePath, arrayBuffer, {
      contentType: getImageContentType(extension),
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return imagePath;
}

export async function createPrescriptionRequest(input: {
  customerId: string;
  vendorId: string;
  addressId: string;
  imagePath: string;
  note?: string;
}) {
  const { data, error } = await supabase
    .from("prescription_requests")
    .insert({
      customer_id: input.customerId,
      vendor_id: input.vendorId,
      address_id: input.addressId,
      image_path: input.imagePath,
      note: input.note?.trim() ? input.note.trim() : null,
    })
    .select()
    .single<PrescriptionRequest>();

  if (error) {
    throw error;
  }

  return data;
}

export async function createOrderFromQuote(quoteId: string) {
  const { data, error } = await supabase.rpc(
    "create_cod_order_from_quote",
    {
      p_quote_id: quoteId,
    }
  );

  return {
    orderId: data ? String(data) : null,
    error,
  };
}

export async function listCurrentCustomerPrescriptionRequests(): Promise<CustomerPrescriptionRequest[]> {
  const { data: customerId, error: customerError } = await supabase.rpc("get_customer_id");

  if (customerError) {
    throw customerError;
  }

  if (!customerId) {
    throw new Error("حساب العميل غير مرتبط بشكل صحيح.");
  }

  const { data, error } = await supabase
    .from("prescription_requests")
    .select(`
      id,
      vendor_id,
      note,
      vendor_note,
      status,
      created_at,
      responded_at,
      vendor:vendors (
        name
      ),
      quotes:prescription_quotes (
        id,
        status,
        vendor_note,
        customer_note,
        subtotal,
        created_at,
        updated_at,
        accepted_at,
        converted_order_id,
        converted_to_order_at,
        items:prescription_quote_items (
          id,
          product_name,
          quantity,
          unit_price,
          line_total,
          availability_status,
          note
        )
      )
    `)
    .eq("customer_id", String(customerId))
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as CustomerPrescriptionRequestQueryRow[]).map((request) => {
    const vendor = readSingle(request.vendor);
    const quote = request.quotes?.[0] ? mapCustomerPrescriptionQuote(request.quotes[0]) : null;

    return {
      id: request.id,
      vendorId: request.vendor_id,
      vendorName: vendor?.name?.trim() || "الصيدلية",
      note: request.note,
      vendorNote: request.vendor_note,
      status: request.status,
      createdAt: request.created_at,
      respondedAt: request.responded_at,
      quote,
    };
  });
}

export async function respondToPrescriptionQuote(input: {
  quoteId: string;
  response: "accepted" | "rejected";
  customerNote?: string;
}) {
  const { data, error } = await supabase.rpc("customer_respond_prescription_quote", {
    p_quote_id: input.quoteId,
    p_response: input.response,
    p_customer_note: input.customerNote ?? "",
  });

  if (error) {
    throw error;
  }

  return String(data);
}

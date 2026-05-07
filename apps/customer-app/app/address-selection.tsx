import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { supabase } from "../src/lib/supabase";
import {
  Card,
  EmptyCard,
  ErrorCard,
  FormInput,
  HelperText,
  LoadingCard,
  Pill,
  PrimaryButton,
  Screen,
  SectionTitle,
} from "../src/components/CustomerUI";
import { formatSavedAddressLine, getSavedAddresses, useCustomerCatalogData } from "../src/lib/customer-catalog";

type AddressFormState = {
  line1: string;
};

type DebugState = {
  authUserId: string | null;
  authUserEmail: string | null;
  customerId: string | null;
  rpcError: string | null;
  lastInsertError: string | null;
  lastUpdateError: string | null;
};

type InsertedAddressRow = {
  id: string;
};

const initialAddressForm: AddressFormState = {
  line1: "",
};

const initialDebugState: DebugState = {
  authUserId: null,
  authUserEmail: null,
  customerId: null,
  rpcError: null,
  lastInsertError: null,
  lastUpdateError: null,
};

function normalizeAddressError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return `${fallback} ${error.message}`;
  }

  return fallback;
}

function validateAddressForm(values: AddressFormState) {
  if (!values.line1.trim()) {
    return "اكتب عنوانك بالتفصيل.";
  }

  return null;
}

export default function AddressSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string | string[] }>();
  const from = Array.isArray(params.from) ? params.from[0] : params.from;

  const { data, loading, error, reload } = useCustomerCatalogData();
  const addresses = useMemo(() => getSavedAddresses(data.addresses), [data.addresses]);

  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressForm, setAddressForm] = useState<AddressFormState>(initialAddressForm);
  const [savingAddressId, setSavingAddressId] = useState<string | null>(null);
  const [creatingAddress, setCreatingAddress] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [debugState, setDebugState] = useState<DebugState>(initialDebugState);

  const backHref = from === "checkout" ? "/checkout" : "/profile";
  const backLabel = from === "checkout" ? "العودة إلى الدفع" : "العودة إلى الحساب";
  const nextStepPrimaryLabel = from === "checkout" ? "العودة إلى الدفع" : "العودة إلى الحساب";

  useEffect(() => {
    const hasDefaultAddress = Boolean(data.defaultAddressId && addresses.some((address) => address.id === data.defaultAddressId));
    const selectedStillExists = addresses.some((address) => address.id === selectedAddressId);

    if (hasDefaultAddress) {
      setSelectedAddressId(String(data.defaultAddressId));
      return;
    }

    if (!selectedStillExists) {
      setSelectedAddressId("");
    }
  }, [addresses, data.defaultAddressId, selectedAddressId]);

  function updateAddressLine(value: string) {
    setAddressForm({ line1: value });
  }

  function navigateAfterSuccess() {
    if (from === "checkout") {
      router.replace("/checkout");
    }
  }

  async function loadCustomerContext() {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      setDebugState((current) => ({
        ...current,
        authUserId: null,
        authUserEmail: null,
        customerId: null,
        rpcError: authError.message,
      }));
      throw authError;
    }

    if (!authUser) {
      setDebugState((current) => ({
        ...current,
        authUserId: null,
        authUserEmail: null,
        customerId: null,
        rpcError: "لا توجد جلسة عميل نشطة.",
      }));
      throw new Error("سجّل الدخول أولًا لحفظ العنوان.");
    }

    const { data: customerId, error: customerError } = await supabase.rpc("get_customer_id");

    setDebugState((current) => ({
      ...current,
      authUserId: authUser.id,
      authUserEmail: authUser.email ?? null,
      customerId: customerId ? String(customerId) : null,
      rpcError: customerError?.message ?? null,
    }));

    if (__DEV__) {
      console.log("[address-selection] auth user", {
        id: authUser.id,
        email: authUser.email ?? null,
      });
      console.log("[address-selection] get_customer_id", {
        customerId: customerId ? String(customerId) : null,
        error: customerError?.message ?? null,
      });
    }

    if (customerError) {
      throw customerError;
    }

    if (!customerId) {
      throw new Error("تعذر تحديد حساب العميل. سجّل الدخول مرة أخرى.");
    }

    return {
      authUser,
      customerId: String(customerId),
    };
  }

  async function updateDefaultAddress(customerId: string, addressId: string) {
    const { data: updatedCustomer, error: updateError } = await supabase
      .from("customers")
      .update({ default_address_id: addressId })
      .eq("id", customerId)
      .select("id")
      .maybeSingle();

    setDebugState((current) => ({
      ...current,
      lastUpdateError: updateError?.message ?? null,
    }));

    if (__DEV__) {
      console.log("[address-selection] update default address", {
        customerId,
        addressId,
        updateError: updateError?.message ?? null,
        updatedCustomerId: updatedCustomer?.id ?? null,
      });
    }

    if (updateError) {
      throw updateError;
    }

    if (!updatedCustomer?.id) {
      throw new Error("تعذر تحديث عنوان التوصيل الافتراضي.");
    }
  }

  useEffect(() => {
    let active = true;

    async function refreshDebugState() {
      try {
        const context = await loadCustomerContext();
        if (!active) {
          return;
        }

        setDebugState((current) => ({
          ...current,
          authUserId: context.authUser.id,
          authUserEmail: context.authUser.email ?? null,
          customerId: context.customerId,
        }));
      } catch {
        if (!active) {
          return;
        }
      }
    }

    void refreshDebugState();

    return () => {
      active = false;
    };
  }, []);

  async function selectAddress(addressId: string) {
    setSavingAddressId(addressId);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const { customerId } = await loadCustomerContext();
      await updateDefaultAddress(customerId, addressId);
      setSelectedAddressId(addressId);
      setSaveSuccess("تم اختيار عنوان التوصيل بنجاح.");
      await reload();
      navigateAfterSuccess();
    } catch (nextError) {
      setSaveError(normalizeAddressError(nextError, "تعذر حفظ العنوان."));
    } finally {
      setSavingAddressId(null);
    }
  }

  async function handleCreateAddress() {
    const validationError = validateAddressForm(addressForm);

    if (validationError) {
      setSaveError(validationError);
      setSaveSuccess(null);
      return;
    }

    setCreatingAddress(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const { customerId } = await loadCustomerContext();
      const payload = {
        customer_id: customerId,
        line_1: addressForm.line1.trim(),
      };
      const { data: insertedAddress, error: insertError } = await supabase
        .from("addresses")
        .insert(payload)
        .select("id")
        .single();

      setDebugState((current) => ({
        ...current,
        lastInsertError: insertError?.message ?? null,
      }));

      if (__DEV__) {
        console.log("[address-selection] insert address", {
          customerId,
          payload,
          insertError: insertError?.message ?? null,
          insertedAddressId: (insertedAddress as InsertedAddressRow | null)?.id ?? null,
        });
      }

      if (insertError) {
        throw insertError;
      }

      const createdAddressId = (insertedAddress as InsertedAddressRow | null)?.id;

      if (!createdAddressId) {
        throw new Error("تعذر حفظ العنوان الجديد.");
      }

      await updateDefaultAddress(customerId, createdAddressId);
      setAddressForm(initialAddressForm);
      setSelectedAddressId(createdAddressId);
      setSaveSuccess("تمت إضافة العنوان وتعيينه عنوانًا افتراضيًا.");
      await reload();
      navigateAfterSuccess();
    } catch (nextError) {
      setSaveError(normalizeAddressError(nextError, "تعذر إضافة العنوان الجديد."));
    } finally {
      setCreatingAddress(false);
    }
  }

  return (
    <Screen title="اختيار العنوان" subtitle="اكتب عنوان التوصيل بالتفصيل أو اختر عنوانًا محفوظًا." backHref={backHref} backLabel={backLabel}>
      {loading ? <LoadingCard message="جارٍ تحميل العناوين..." /> : null}
      {!loading && error ? <ErrorCard message={error} onRetry={() => void reload()} /> : null}
      {saveError ? <ErrorCard message={saveError} /> : null}
      {saveSuccess ? (
        <Card style={styles.successCard}>
          <HelperText tone="success">{saveSuccess}</HelperText>
        </Card>
      ) : null}

      <Card>
        <SectionTitle label="إضافة عنوان جديد" />
        <Text style={styles.fieldLabel}>العنوان</Text>
        <FormInput
          value={addressForm.line1}
          onChangeText={updateAddressLine}
          placeholder="اكتب عنوانك بالتفصيل"
          multiline
          numberOfLines={4}
        />
        <HelperText tone="info">اكتب العنوان كاملًا مثل اسم المنطقة، الشارع، رقم المبنى، وأي علامة مميزة.</HelperText>
        <PrimaryButton
          label={creatingAddress ? "جارٍ حفظ العنوان..." : "حفظ العنوان"}
          onPress={() => void handleCreateAddress()}
          disabled={creatingAddress || savingAddressId !== null}
        />
      </Card>

      <SectionTitle label="العناوين المحفوظة" />

      {!loading && !error && addresses.length === 0 ? (
        <EmptyCard title="لا توجد عناوين محفوظة" message="أضف عنوان التوصيل حتى تتمكن من إكمال الطلب." />
      ) : null}

      {addresses.map((address) => {
        const selected = address.id === selectedAddressId;
        const isDefault = address.id === data.defaultAddressId;

        return (
          <Card key={address.id} style={[styles.addressCard, selected ? styles.addressCardSelected : null]}>
            <View style={styles.addressHeader}>
              <View style={styles.addressCopy}>
                <Text style={styles.addressLine}>{formatSavedAddressLine(address)}</Text>
              </View>
              {isDefault ? <Pill label="العنوان الافتراضي" tone="success" /> : selected ? <Pill label="محدد" tone="info" /> : null}
            </View>

            <PrimaryButton
              label={savingAddressId === address.id ? "جارٍ الحفظ..." : isDefault ? "العنوان المحدد" : "استخدام هذا العنوان"}
              variant={isDefault ? "primary" : "secondary"}
              disabled={savingAddressId !== null || creatingAddress}
              onPress={() => void selectAddress(address.id)}
            />
          </Card>
        );
      })}

      <Card>
        <SectionTitle label="الخطوة التالية" />
        <Text style={styles.nextStepText}>بعد اختيار العنوان أو إضافته يمكنك العودة إلى الدفع أو متابعة تصفح المنتجات.</Text>
        <PrimaryButton label={nextStepPrimaryLabel} onPress={() => router.replace(backHref as never)} />
        <PrimaryButton label="متابعة التسوق" variant="secondary" onPress={() => router.push("/product-listing")} />
      </Card>

      {__DEV__ ? (
        <Card>
          <SectionTitle label="Debug" />
          <HelperText tone="info">{`authUser.id: ${debugState.authUserId ?? "-"}`}</HelperText>
          <HelperText tone="info">{`authUser.email: ${debugState.authUserEmail ?? "-"}`}</HelperText>
          <HelperText tone="info">{`get_customer_id: ${debugState.customerId ?? "-"}`}</HelperText>
          <HelperText tone={debugState.rpcError ? "danger" : "info"}>{`rpc error: ${debugState.rpcError ?? "-"}`}</HelperText>
          <HelperText tone={debugState.lastInsertError ? "danger" : "info"}>{`insert error: ${debugState.lastInsertError ?? "-"}`}</HelperText>
          <HelperText tone={debugState.lastUpdateError ? "danger" : "info"}>{`update error: ${debugState.lastUpdateError ?? "-"}`}</HelperText>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  successCard: {
    backgroundColor: "#E8F7EE",
    borderColor: "#D0E9D9",
  },
  addressCard: {
    gap: theme.spacing[16],
  },
  addressCardSelected: {
    backgroundColor: "#E8F7EE",
    borderColor: "#D0E9D9",
  },
  addressHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    gap: theme.spacing[12],
    alignItems: "flex-start",
  },
  addressCopy: {
    flex: 1,
    gap: 4,
  },
  addressLine: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    lineHeight: theme.typography.lineHeight.body,
    textAlign: "right",
  },
  fieldLabel: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: theme.typography.body.sm,
    textAlign: "right",
  },
  nextStepText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: 24,
    textAlign: "right",
  },
});

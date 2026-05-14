"use client";

import { useEffect, useState } from "react";
import { Card } from "../../../../components/ui/card";
import { EmptyState } from "../../../../components/ui/empty-state";
import { ErrorState } from "../../../../components/ui/error-state";
import { LoadingState } from "../../../../components/ui/loading-state";
import { Table } from "../../../../components/ui/table";
import { getSupabaseBrowserClient } from "../../../../lib/supabase/browser";
import { formatDate } from "../../../../lib/utils/format-date";
import type { AdminCustomerRow, AsyncState } from "../shared/admin-types";
import { normalizeError, readSingle } from "../shared/admin-utils";

async function loadAdminCustomersData(): Promise<AdminCustomerRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("customers")
    .select(`
      id,
      created_at,
      profile:profiles!customers_user_id_fkey(full_name, phone)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((customer) => {
    const profile = readSingle(customer.profile as { full_name?: string; phone?: string | null } | { full_name?: string; phone?: string | null }[] | null);

    return {
      id: String(customer.id),
      fullName: profile?.full_name ?? "العميل",
      phone: profile?.phone ?? null,
      createdAt: String(customer.created_at ?? ""),
    };
  });
}

function AdminCustomersManager() {
  const [state, setState] = useState<AsyncState<AdminCustomerRow[]>>({
    data: null,
    error: null,
    loading: true,
  });

  async function load() {
    setState({
      data: null,
      error: null,
      loading: true,
    });

    try {
      const data = await loadAdminCustomersData();
      setState({
        data,
        error: null,
        loading: false,
      });
    } catch (error) {
      setState({
        data: null,
        error: normalizeError(error),
        loading: false,
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (state.loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="جارٍ تحميل العملاء من Supabase..." />
      </Card>
    );
  }

  if (state.error) {
    return (
      <Card className="medical-panel">
        <ErrorState message={state.error} onRetry={() => void load()} />
      </Card>
    );
  }

  const customers = state.data ?? [];

  return customers.length === 0 ? (
    <Card className="medical-panel">
      <EmptyState title="لا يوجد عملاء بعد" message="لم يسجل أي عملاء بعد." />
    </Card>
  ) : (
    <Table
      title="العملاء"
      headers={["العميل", "الهاتف", "تاريخ الانضمام", "الحالة"]}
      rows={customers.map((customer) => [
        customer.fullName,
        customer.phone ?? "-",
        customer.createdAt ? formatDate(customer.createdAt) : "-",
        "للقراءة فقط",
      ])}
      emptyMessage="لم يسجل أي عملاء بعد."
    />
  );
}

export function AdminCustomersClient() {
  return <AdminCustomersManager />;
}

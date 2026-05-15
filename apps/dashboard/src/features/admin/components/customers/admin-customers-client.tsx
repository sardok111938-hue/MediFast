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
import { normalizeError } from "../shared/admin-utils";

type CustomerRow = {
  id: string;
  user_id: string | null;
  created_at: string | null;
};

type ProfileRow = {
  id: string | null;
  full_name: string | null;
  phone: string | null;
};

async function loadAdminCustomersData(): Promise<AdminCustomerRow[]> {
  const supabase = getSupabaseBrowserClient();

  const { data: customers, error: customersError } = await supabase
    .from("customers")
    .select("id, user_id, created_at")
    .order("created_at", { ascending: false });

  if (customersError) {
    throw customersError;
  }

  const customerRows = (customers ?? []) as CustomerRow[];

  const userIds = Array.from(
    new Set(
      customerRows
        .map((customer) => customer.user_id)
        .filter((userId): userId is string => Boolean(userId)),
    ),
  );

  const profileById = new Map<string, ProfileRow>();

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, phone")
      .in("id", userIds);

    if (profilesError) {
      throw profilesError;
    }

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      if (profile.id) {
        profileById.set(String(profile.id), profile);
      }
    }
  }

  return customerRows.map((customer) => {
    const profile = customer.user_id ? profileById.get(String(customer.user_id)) : null;

    const fullName = profile?.full_name?.trim();

    return {
      id: String(customer.id),
      fullName: fullName && fullName.length > 0 ? fullName : "عميل بدون اسم",
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
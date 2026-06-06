"use client";

import { useEffect, useState } from "react";
import { Card } from "../../../../components/ui/card";
import { EmptyState } from "../../../../components/ui/empty-state";
import { ErrorState } from "../../../../components/ui/error-state";
import { LoadingState } from "../../../../components/ui/loading-state";
import { Table } from "../../../../components/ui/table";
import { buildPaginatedResult, DEFAULT_PAGE_SIZE, getPaginationRange } from "../../../../lib/pagination";
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

type AdminCustomersData = ReturnType<typeof buildPaginatedResult<AdminCustomerRow>>;

async function loadAdminCustomersData(page: number): Promise<AdminCustomersData> {
  const supabase = getSupabaseBrowserClient();
  const { from, to } = getPaginationRange(page, DEFAULT_PAGE_SIZE);

  const { data: customers, error: customersError, count } = await supabase
    .from("customers")
    .select("id, user_id, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

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

  const rows = customerRows.map((customer) => {
    const profile = customer.user_id ? profileById.get(String(customer.user_id)) : null;

    const fullName = profile?.full_name?.trim();

    return {
      id: String(customer.id),
      fullName: fullName && fullName.length > 0 ? fullName : "عميل بدون اسم",
      phone: profile?.phone ?? null,
      createdAt: String(customer.created_at ?? ""),
    };
  });

  return buildPaginatedResult(rows, count, { page, pageSize: DEFAULT_PAGE_SIZE });
}

function AdminCustomersManager() {
  const [state, setState] = useState<AsyncState<AdminCustomersData>>({
    data: null,
    error: null,
    loading: true,
  });
  const [page, setPage] = useState(1);

  async function load() {
    setState({
      data: null,
      error: null,
      loading: true,
    });

    try {
      const data = await loadAdminCustomersData(page);
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
  }, [page]);

  if (state.loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="جارٍ تحميل الزبائن من Supabase..." />
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

  const customers = state.data?.rows ?? [];

  return customers.length === 0 ? (
    <Card className="medical-panel">
      <EmptyState title="لا يوجد زبائن بعد" message="لم يسجل أي زبائن بعد." />
    </Card>
  ) : (
    <div className="stack">
      <PaginationSummary
        totalCount={state.data?.totalCount ?? 0}
        page={state.data?.page ?? page}
        pageCount={state.data?.pageCount ?? 1}
        onPrevious={() => setPage((current) => Math.max(1, current - 1))}
        onNext={() => setPage((current) => Math.min(state.data?.pageCount ?? current, current + 1))}
      />
      <Table
        title="الزبائن"
        headers={["الزبون", "الهاتف", "تاريخ الانضمام", "الحالة"]}
        rows={customers.map((customer) => [
          customer.fullName,
          customer.phone ?? "-",
          customer.createdAt ? formatDate(customer.createdAt) : "-",
          "للقراءة فقط",
        ])}
        emptyMessage="لم يسجل أي زبائن بعد."
      />
    </div>
  );
}

function PaginationSummary({
  totalCount,
  page,
  pageCount,
  onPrevious,
  onNext,
}: {
  totalCount: number;
  page: number;
  pageCount: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <Card className="medical-panel">
      <div className="split-actions">
        <p className="muted">الإجمالي: {totalCount} · الصفحة {page} من {pageCount}</p>
        <div className="inline-actions">
          <button className="secondary-button" type="button" disabled={page <= 1} onClick={onPrevious}>
            السابق
          </button>
          <button className="secondary-button" type="button" disabled={page >= pageCount} onClick={onNext}>
            التالي
          </button>
        </div>
      </div>
    </Card>
  );
}

export function AdminCustomersClient() {
  return <AdminCustomersManager />;
}

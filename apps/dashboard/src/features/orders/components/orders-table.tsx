import type { ReactNode } from "react";
import { Table } from "../../../components/ui/table";

export function OrdersTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: ReactNode[][];
}) {
  return <Table title={title} headers={headers} rows={rows} />;
}

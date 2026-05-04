export interface DashboardProfile {
  id: string;
  role: "admin" | "vendor" | "customer" | "driver";
  full_name: string;
}

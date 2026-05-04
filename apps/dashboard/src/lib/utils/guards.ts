export function isRole(value: string | null | undefined, expected: "admin" | "driver" | "vendor") {
  return value === expected;
}

"use client";

import { useFormStatus } from "react-dom";
import { Button } from "../../../components/ui/button";

export function AssignmentSubmitButton({
  disabled = false,
}: {
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" loading={pending} disabled={disabled}>
      {pending ? "جارٍ الإسناد..." : "إسناد السائق"}
    </Button>
  );
}

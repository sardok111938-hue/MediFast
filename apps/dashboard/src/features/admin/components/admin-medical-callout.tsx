"use client";

import { Badge } from "../../../components/ui/badge";
import { Card } from "../../../components/ui/card";
import { useLocale } from "../../../lib/i18n/locale-context";

export function AdminMedicalCallout({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const { t } = useLocale();

  return (
    <Card className="medical-callout">
      <Badge>العمليات الطبية</Badge>
      <h3>{t(title)}</h3>
      <p className="muted">{t(body)}</p>
    </Card>
  );
}

import { Card, DetailRow, Screen } from "../src/components/CustomerUI";

export default function ProfileScreen() {
  return (
    <Screen title="Profile" subtitle="Account preferences, address book, support, and saved details.">
      <Card>
        <DetailRow label="الاسم" value="عميل تجريبي" />
        <DetailRow label="الهاتف" value="+966 55 123 4444" />
        <DetailRow label="طريقة الدفع المفضلة" value="الدفع عند الاستلام" />
      </Card>
    </Screen>
  );
}

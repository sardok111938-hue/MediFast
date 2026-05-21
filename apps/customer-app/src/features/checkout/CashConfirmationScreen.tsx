import { Card, Screen } from "../../components/CustomerUI";
import { Text } from "react-native";
import { theme } from "@medifast/ui";

export default function CashConfirmationScreen() {
  return (
    <Screen title="الدفع عند الاستلام" subtitle="رسالة تأكيد أخيرة قبل إرسال الطلب.">
      <Card>
        <Text style={{ color: theme.colors.text, textAlign: "right", lineHeight: theme.typography.lineHeight.body }}>
          يُفضّل تجهيز المبلغ كاملًا أو مبلغ قريب منه قدر الإمكان.
        </Text>
        <Text style={{ color: theme.colors.text, textAlign: "right", lineHeight: theme.typography.lineHeight.body }}>
          سيقوم السائق بتحصيل المبلغ عند تسليم الطلب إليك.
        </Text>
      </Card>
    </Screen>
  );
}

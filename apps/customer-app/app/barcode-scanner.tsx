import { Card, PrimaryButton, Screen } from "../src/components/CustomerUI";
import { Text } from "react-native";
import { theme } from "@medifast/ui";

export default function BarcodeScannerScreen() {
  return (
    <Screen title="Barcode Scanner" subtitle="Expo camera integration can be connected here later.">
      <Card>
        <Text style={{ color: theme.colors.text, lineHeight: theme.typography.lineHeight.body, textAlign: "right" }}>
          امسح باركود الدواء للانتقال مباشرة إلى صفحة تفاصيل المنتج.
        </Text>
        <PrimaryButton label="Open scanner placeholder" />
      </Card>
    </Screen>
  );
}

import { Card, Screen } from "../src/components/CustomerUI";
import { Text } from "react-native";

export default function CashConfirmationScreen() {
  return (
    <Screen title="Cash on Delivery" subtitle="Final confirmation state before order placement.">
      <Card>
        <Text>Please prepare exact or near-exact cash where possible.</Text>
        <Text>The driver will collect payment once your order is delivered.</Text>
      </Card>
    </Screen>
  );
}

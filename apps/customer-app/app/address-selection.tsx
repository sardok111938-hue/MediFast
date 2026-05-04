import { addresses } from "@medifast/ui";
import { Card, Screen } from "../src/components/CustomerUI";
import { Text } from "react-native";

export default function AddressSelectionScreen() {
  return (
    <Screen title="Address Selection" subtitle="Choose where the order should be delivered.">
      {addresses.map((address) => (
        <Card key={address.id}>
          <Text style={{ fontWeight: "800" }}>{address.label}</Text>
          <Text>{address.line_1}</Text>
          <Text>{address.area}</Text>
        </Card>
      ))}
    </Screen>
  );
}

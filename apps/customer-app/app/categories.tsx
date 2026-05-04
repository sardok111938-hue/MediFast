import { categories } from "@medifast/ui";
import { Card, HelperText, Screen } from "../src/components/CustomerUI";

export default function CategoriesScreen() {
  return (
    <Screen title="Categories" subtitle="Browse pharmacy essentials by category.">
      {categories.map((category) => (
        <Card key={category.id}>
          <HelperText tone="success">{category.name}</HelperText>
        </Card>
      ))}
    </Screen>
  );
}

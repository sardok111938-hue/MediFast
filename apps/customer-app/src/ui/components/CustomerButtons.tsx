import { Ionicons } from "@expo/vector-icons";
import { theme } from "@medifast/ui";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useCustomerI18n } from "../../infrastructure/i18n/CustomerI18nProvider";
import type { IconName } from "./helpers";

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = "primary",
  loading = false,
  icon,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  icon?: IconName;
}) {
  const { t, isRTL } = useCustomerI18n();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" ? styles.buttonSecondary : null,
        variant === "ghost" ? styles.buttonGhost : null,
        disabled || loading ? styles.buttonDisabled : null,
        pressed && !disabled && !loading ? styles.buttonPressed : null,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <View style={[styles.buttonContent, isRTL ? styles.buttonContentRtl : null]}>
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={variant === "primary" ? "#FFFFFF" : variant === "ghost" ? theme.colors.primaryDark : theme.colors.text}
          />
        ) : null}
        <Text
          style={[
            styles.buttonText,
            variant === "secondary" ? styles.buttonTextSecondary : null,
            variant === "ghost" ? styles.buttonTextGhost : null,
          ]}
        >
          {t(label)}
        </Text>
      </View>
    </Pressable>
  );
}

export function QuantityStepper({
  value,
  onIncrement,
  onDecrement,
  disableIncrement,
  disableDecrement,
}: {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disableIncrement?: boolean;
  disableDecrement?: boolean;
}) {
  return (
    <View style={styles.quantityWrap}>
      <Pressable style={[styles.quantityButton, disableIncrement ? styles.quantityButtonDisabled : null]} onPress={onIncrement} disabled={disableIncrement}>
        <Ionicons name="add" size={16} color={theme.colors.text} />
      </Pressable>
      <Text style={styles.quantityValue}>{value}</Text>
      <Pressable style={[styles.quantityButton, disableDecrement ? styles.quantityButtonDisabled : null]} onPress={onDecrement} disabled={disableDecrement}>
        <Ionicons name="remove" size={16} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing[20],
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: "rgba(20, 83, 45, 0.08)",
  },
  buttonGhost: {
    backgroundColor: "transparent",
    minHeight: 40,
    paddingHorizontal: 0,
    alignItems: "flex-start",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    opacity: 0.94,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[8],
  },
  buttonContentRtl: {
    flexDirection: "row-reverse",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: theme.typography.body.md,
    textAlign: "center",
    lineHeight: theme.typography.lineHeight.compact,
    flexShrink: 1,
  },
  buttonTextSecondary: {
    color: theme.colors.text,
  },
  buttonTextGhost: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.body.md,
  },
  quantityWrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EEF7F1",
    borderRadius: 999,
    padding: 4,
    gap: theme.spacing[8],
  },
  quantityButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonDisabled: {
    opacity: 0.45,
  },
  quantityValue: {
    minWidth: 28,
    textAlign: "center",
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.body.md,
  },
});

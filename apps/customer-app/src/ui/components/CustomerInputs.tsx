import { Ionicons } from "@expo/vector-icons";
import { theme } from "@medifast/ui";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";
import { useCustomerI18n } from "../../infrastructure/i18n/CustomerI18nProvider";

export function SearchInput({
  placeholder,
  value,
  onChangeText,
  onPress,
}: {
  placeholder: string;
  value?: string;
  onChangeText?: (value: string) => void;
  onPress?: () => void;
}) {
  const { t, isRTL } = useCustomerI18n();

  if (onPress && !onChangeText) {
    return (
      <Pressable style={[styles.searchWrap, isRTL ? styles.searchWrapRtl : null]} onPress={onPress}>
        <Ionicons name="search" size={18} color={theme.colors.muted} />
        <Text style={[styles.searchButtonText, isRTL ? styles.textRight : null]}>{t(placeholder)}</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.searchWrap, isRTL ? styles.searchWrapRtl : null]}>
      <Ionicons name="search" size={18} color={theme.colors.muted} />
      <TextInput
        placeholder={t(placeholder)}
        placeholderTextColor={theme.colors.muted}
        style={[styles.searchInput, isRTL ? styles.searchInputRtl : null]}
        value={value}
        onChangeText={onChangeText}
        textAlign={isRTL ? "right" : "left"}
      />
    </View>
  );
}

export function FormInput({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  multiline,
  numberOfLines,
  ...props
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
} & Omit<TextInputProps, "onChangeText" | "placeholder" | "value">) {
  const { t, isRTL } = useCustomerI18n();

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={t(placeholder)}
      placeholderTextColor={theme.colors.muted}
      secureTextEntry={secureTextEntry}
      autoCapitalize="none"
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical={multiline ? "top" : "center"}
      textAlign={isRTL ? "right" : "left"}
      style={[styles.formInput, multiline ? styles.formInputMultiline : null, isRTL ? styles.formInputRtl : null]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  textRight: {
    textAlign: "right",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[8],
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: theme.spacing[16],
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(20, 83, 45, 0.07)",
    shadowColor: theme.shadows.card.shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  searchWrapRtl: {
    flexDirection: "row-reverse",
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
  },
  searchInputRtl: {
    textAlign: "right",
    writingDirection: "rtl",
  },
  searchButtonText: {
    flex: 1,
    color: theme.colors.muted,
    fontSize: theme.typography.body.md,
  },
  formInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    paddingHorizontal: theme.spacing[16],
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(20, 83, 45, 0.08)",
    color: theme.colors.text,
    minHeight: 50,
    fontSize: theme.typography.body.md,
  },
  formInputMultiline: {
    minHeight: 112,
    paddingTop: 14,
    paddingBottom: 14,
  },
  formInputRtl: {
    textAlign: "right",
    writingDirection: "rtl",
  },
});

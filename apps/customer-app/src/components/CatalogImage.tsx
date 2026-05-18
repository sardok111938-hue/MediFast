import { useEffect, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageResizeMode,
  type ImageStyle,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { theme } from "@medifast/ui";

type CatalogImageProps = {
  uri?: string | null;
  alt: string;
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  fallbackLabel?: string;
  fallbackTextStyle?: StyleProp<TextStyle>;
  resizeMode?: ImageResizeMode;
};

export function CatalogImage({
  uri,
  alt,
  containerStyle,
  imageStyle,
  fallbackLabel = "صورة المنتج",
  fallbackTextStyle,
  resizeMode = "cover",
}: CatalogImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const safeUri = uri?.trim() || null;
const imageUri = safeUri ? `${safeUri}?v=${encodeURIComponent(safeUri)}` : null;
const showFallback = failed || !imageUri;

  return (
    <View style={[styles.container, containerStyle]}>
      {showFallback ? (
        <View style={styles.fallback}>
          <Text style={styles.fallbackIcon}>＋</Text>
          <Text style={[styles.fallbackText, fallbackTextStyle]}>{fallbackLabel}</Text>
        </View>
      ) : (
        <Image
          source={{ uri: imageUri }}
          accessibilityLabel={alt}
          resizeMode={resizeMode}
          style={[styles.image, imageStyle]}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderRadius: 22,
    backgroundColor: "#F7FAF8",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    flex: 1,
    width: "100%",
    height: "100%",
    minHeight: 96,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: theme.spacing[12],
    backgroundColor: "#E8F7EE",
  },
  fallbackIcon: {
    color: theme.colors.primaryDark,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
  },
  fallbackText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
    textAlign: "center",
  },
});
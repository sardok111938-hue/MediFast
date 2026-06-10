import { theme } from "@medifast/ui";
import type { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDriverI18n } from "../../lib/i18n";
import { DriverBadge, DriverCard } from "../shared/DriverPrimitives";

function renderTranslatedText(value: ReactNode, translate: (key: string) => string) {
  return typeof value === "string" ? translate(value) : value;
}

export function DriverListCard({
  title,
  subtitle,
  meta,
  badge,
  children,
  action,
  footer,
  compact = false,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
}) {
  const { t, isRTL } = useDriverI18n();

  return (
    <DriverCard variant="elevated" compact={compact}>
      <View style={[styles.listCardHeader, isRTL ? styles.listCardHeaderRtl : null]}>
        <View style={styles.listCardText}>
          <Text style={[styles.listCardTitle, isRTL ? styles.textRight : null]} numberOfLines={2}>
            {renderTranslatedText(title, t)}
          </Text>

          {subtitle ? (
            <Text style={[styles.listCardSubtitle, isRTL ? styles.textRight : null]} numberOfLines={2}>
              {renderTranslatedText(subtitle, t)}
            </Text>
          ) : null}

          {meta ? <View style={[styles.cardMeta, isRTL ? styles.cardMetaRtl : null]}>{meta}</View> : null}
        </View>

        {badge ? <View style={styles.badgeSlot}>{badge}</View> : null}
      </View>

      {children ? <View style={styles.listCardBody}>{children}</View> : null}

      {action ? <View style={styles.cardAction}>{action}</View> : null}

      {footer ? <View style={[styles.cardFooter, isRTL ? styles.cardFooterRtl : null]}>{footer}</View> : null}
    </DriverCard>
  );
}

export function DriverMetaPill({ children }: { children: ReactNode }) {
  const { t } = useDriverI18n();

  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaPillText} numberOfLines={1}>
        {renderTranslatedText(children, t)}
      </Text>
    </View>
  );
}

export function DriverInfoPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "success" | "warning" | "info";
}) {
  const { t, isRTL } = useDriverI18n();

  return (
    <View
      style={[
        styles.infoPill,
        tone === "success" ? styles.infoPillSuccess : null,
        tone === "warning" ? styles.infoPillWarning : null,
        tone === "info" ? styles.infoPillInfo : null,
        isRTL ? styles.infoPillRtl : null,
      ]}
    >
      <Text style={[styles.infoPillLabel, isRTL ? styles.textRight : null]} numberOfLines={1}>
        {t(label)}
      </Text>
      <Text style={[styles.infoPillValue, isRTL ? styles.textRight : null]} numberOfLines={1}>
        {renderTranslatedText(value, t)}
      </Text>
    </View>
  );
}

export function DriverMetricBadge({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "success" | "warning" | "info";
}) {
  return <DriverInfoPill label={label} value={value} tone={tone} />;
}

export function DriverQuickAction({
  label,
  onPress,
  disabled,
  tone = "neutral",
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  tone?: "neutral" | "primary";
}) {
  const { t } = useDriverI18n();

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      style={[styles.quickAction, tone === "primary" ? styles.quickActionPrimary : null, disabled ? styles.quickActionDisabled : null]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.quickActionText, tone === "primary" ? styles.quickActionTextPrimary : null]} numberOfLines={1}>
        {t(label)}
      </Text>
    </TouchableOpacity>
  );
}

export function DriverUtilityRow({ children }: { children: ReactNode }) {
  const { isRTL } = useDriverI18n();

  return <View style={[styles.utilityRow, isRTL ? styles.utilityRowRtl : null]}>{children}</View>;
}

export function DriverNoteCard({ title, children }: { title: string; children: ReactNode }) {
  const { t, isRTL } = useDriverI18n();

  return (
    <View style={styles.noteCard}>
      <Text style={[styles.noteTitle, isRTL ? styles.textRight : null]}>{t(title)}</Text>
      <Text style={[styles.noteBody, isRTL ? styles.textRight : null]}>{renderTranslatedText(children, t)}</Text>
    </View>
  );
}

export function DriverRow({
  label,
  value,
  valueTone = "default",
}: {
  label: string;
  value: ReactNode;
  valueTone?: "default" | "muted";
}) {
  const { t, isRTL } = useDriverI18n();

  return (
    <View style={[styles.row, isRTL ? styles.rowRtl : null]}>
      <Text style={[styles.rowLabel, isRTL ? styles.textRight : null]}>{t(label)}</Text>
      <Text style={[styles.rowValue, valueTone === "muted" ? styles.rowValueMuted : null, isRTL ? styles.textRight : null]}>
        {renderTranslatedText(value, t)}
      </Text>
    </View>
  );
}

export function DriverRouteBlock({
  pickup,
  dropoff,
  compact = false,
}: {
  pickup: string;
  dropoff: string;
  compact?: boolean;
}) {
  const { t, isRTL } = useDriverI18n();

  return (
    <View style={[styles.routeBlock, compact ? styles.routeBlockCompact : null]}>
      <View style={[styles.routeRow, isRTL ? styles.routeRowRtl : null]}>
        <View style={styles.routeMarkerWrap}>
          <View style={styles.routeDot} />
          <View style={styles.routeLine} />
        </View>

        <View style={styles.routeText}>
          <Text style={[styles.routeLabel, isRTL ? styles.textRight : null]}>
  عنوان الصيدلية
</Text>
          <Text style={[styles.routeValue, isRTL ? styles.textRight : null]} numberOfLines={compact ? 1 : 2}>
            {pickup}
          </Text>
        </View>
      </View>

      <View style={[styles.routeRow, isRTL ? styles.routeRowRtl : null]}>
        <View style={styles.routeMarkerWrap}>
          <View style={[styles.routeDot, styles.routeDotDropoff]} />
        </View>

        <View style={styles.routeText}>
          <Text style={[styles.routeLabel, isRTL ? styles.textRight : null]}>
  عنوان التسليم
</Text>
          <Text style={[styles.routeValue, isRTL ? styles.textRight : null]} numberOfLines={compact ? 1 : 2}>
            {dropoff}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function DriverRoutePreview(props: { pickup: string; dropoff: string; compact?: boolean }) {
  return <DriverRouteBlock {...props} />;
}

export function DriverActionBar({ children }: { children: ReactNode }) {
  const { isRTL } = useDriverI18n();

  return <View style={[styles.actionBar, isRTL ? styles.actionBarRtl : null]}>{children}</View>;
}

export function DriverOrderCard({
  vendorName,
  customerName,
  orderRef,
  statusLabel,
  statusTone = "neutral",
  pickupAddress,
  dropoffAddress,
  distanceKm,
  action,
  utilities,
  footer,
  compact = true,
}: {
  vendorName: string;
  customerName: string;
  orderRef: string;
  statusLabel: string;
  statusTone?: "neutral" | "warning" | "success" | "danger" | "info";
  pickupAddress: string;
  dropoffAddress: string;
  distanceKm?: number | null;
  action?: ReactNode;
  utilities?: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
}) {

return (
  <DriverListCard
    title={null}
    subtitle={null}
    meta={<DriverMetaPill>{orderRef}</DriverMetaPill>}
    badge={<DriverBadge label={statusLabel} tone={statusTone} />}
    action={action}
    footer={footer}
    compact={compact}
  >
    <View style={styles.orderIdentityGrid}>
      <View style={styles.orderIdentityCard}>
        <Text style={[styles.listCardTitle, styles.textRight]} numberOfLines={2}>
          الصيدلية: {vendorName}
        </Text>
        <Text style={[styles.listCardSubtitle, styles.textRight]} numberOfLines={2}>
          {pickupAddress}
        </Text>
      </View>

      <View style={styles.orderIdentityCard}>
        <Text style={[styles.listCardTitle, styles.textRight]} numberOfLines={2}>
          الزبون: {customerName}
        </Text>
        {distanceKm != null ? (
  <Text style={styles.distanceText}>
    {distanceKm.toFixed(1)} كم من الصيدلية
  </Text>
) : null}
        <Text style={[styles.listCardSubtitle, styles.textRight]} numberOfLines={2}>
          {dropoffAddress}
        </Text>
      </View>
    </View>

    <DriverRoutePreview pickup={pickupAddress} dropoff={dropoffAddress} compact={compact} />

    {utilities ? <View style={styles.cardUtilities}>{utilities}</View> : null}
  </DriverListCard>
);
}
const styles = StyleSheet.create({
  textRight: {
    textAlign: "right",
  },
  listCardHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },
  listCardHeaderRtl: {
    flexDirection: "row-reverse",
  },
  listCardText: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing[4],
  },
  listCardTitle: {
  fontSize: 17,
  fontWeight: "800",
  color: theme.colors.text,
  lineHeight: 24,
},
  listCardSubtitle: {
  color: theme.colors.muted,
  fontSize: 13,
  lineHeight: 20,
  fontWeight: "600",
},
  badgeSlot: {
    flexShrink: 0,
    maxWidth: 128,
    alignItems: "flex-end",
  },
  cardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[8],
    paddingTop: theme.spacing[4],
  },
  cardMetaRtl: {
    flexDirection: "row-reverse",
  },
  listCardBody: {
    gap: 10,
  },
  cardUtilities: {
    marginTop: -theme.spacing[4],
  },
  cardAction: {
    paddingTop: 2,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#EDF2EF",
    paddingTop: theme.spacing[8],
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[8],
    alignItems: "center",
  },
  cardFooterRtl: {
    flexDirection: "row-reverse",
  },
  metaPill: {
    backgroundColor: "#EEF4F1",
    borderRadius: 999,
    paddingHorizontal: theme.spacing[8],
    paddingVertical: theme.spacing[4],
    maxWidth: "100%",
  },
  metaPillText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
    lineHeight: 16,
  },
  infoPill: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 96,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: "#E5EEE9",
    backgroundColor: "#F8FBF9",
    paddingHorizontal: theme.spacing[8],
    paddingVertical: theme.spacing[8],
    gap: 2,
  },
  infoPillRtl: {
    alignItems: "flex-end",
  },
  infoPillSuccess: {
    backgroundColor: "#EFFAF4",
    borderColor: "#CFEBDD",
  },
  infoPillWarning: {
    backgroundColor: "#FFF7E8",
    borderColor: "#F3D9A7",
  },
  infoPillInfo: {
    backgroundColor: "#EEF7FF",
    borderColor: "#CFE5F6",
  },
  infoPillLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
    lineHeight: 15,
  },
  infoPillValue: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
    lineHeight: 17,
  },
  utilityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    alignItems: "center",
  },
  utilityRowRtl: {
    flexDirection: "row-reverse",
  },
  quickAction: {
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DCE8E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
    flexBasis: "30%",
  },
  quickActionPrimary: {
    backgroundColor: "#EEF7F2",
    borderColor: "#CFEBDD",
  },
  quickActionDisabled: {
    opacity: 0.45,
  },
  quickActionText: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
    lineHeight: 17,
  },
  quickActionTextPrimary: {
    color: theme.colors.primaryDark,
  },
  noteCard: {
    backgroundColor: "#F8FBF9",
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: "#E5EEE9",
    padding: theme.spacing[12],
    gap: theme.spacing[4],
  },
  noteTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body.sm,
    fontWeight: "800",
    lineHeight: 20,
  },
  noteBody: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    fontWeight: "600",
    lineHeight: 21,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing[12],
    alignItems: "flex-start",
    paddingVertical: theme.spacing[4],
  },
  rowRtl: {
    flexDirection: "row-reverse",
  },
  rowLabel: {
    color: theme.colors.muted,
    fontWeight: "800",
    flex: 0.9,
    fontSize: theme.typography.body.sm,
    lineHeight: 20,
  },
  rowValue: {
    color: theme.colors.text,
    flex: 1.5,
    textAlign: "right",
    fontSize: theme.typography.body.sm,
    lineHeight: 20,
    minWidth: 0,
    fontWeight: "600",
  },
  rowValueMuted: {
    color: theme.colors.muted,
  },
  routeBlock: {
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.md,
    padding: 10,
    gap: 7,
    borderWidth: 1,
    borderColor: "#EDF2EF",
  },
  routeBlockCompact: {
    padding: 10,
    gap: 7,
  },
  routeRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  routeRowRtl: {
    flexDirection: "row-reverse",
  },
  routeMarkerWrap: {
    width: 16,
    alignItems: "center",
    paddingTop: theme.spacing[4],
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.primaryDark,
  },
  routeDotDropoff: {
    backgroundColor: theme.colors.info,
  },
  routeLine: {
    width: 2,
    height: 18,
    backgroundColor: "#DDE8E2",
    marginTop: 4,
    borderRadius: 999,
  },
  routeText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  routeLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
    lineHeight: 15,
  },
  routeValue: {
    color: theme.colors.text,
    fontSize: theme.typography.body.sm,
    lineHeight: 19,
    fontWeight: "600",
  },
  actionBar: {
    flexDirection: "row",
    gap: theme.spacing[8],
    alignItems: "center",
  },
  actionBarRtl: {
    flexDirection: "row-reverse",
  },
orderIdentityGrid: {
  gap: 14,
  marginBottom: 4,
},

orderIdentityCard: {
  backgroundColor: "#F8FBF9",
  borderRadius: 18,

  borderWidth: 1,
  borderColor: "#EDF2EF",

  paddingHorizontal: 14,
  paddingVertical: 12,

  gap: 4,
  alignItems: "flex-end",
},
identityLabel: {
  fontSize: theme.typography.caption.sm,
  fontWeight: "800",
  color: theme.colors.muted,
},
distanceText: {
  color: theme.colors.primaryDark,
  fontSize: theme.typography.caption.md,
  fontWeight: "900",
  textAlign: "right",
},
});

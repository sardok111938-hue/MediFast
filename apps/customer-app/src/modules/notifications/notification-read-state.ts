import AsyncStorage from "@react-native-async-storage/async-storage";

const CUSTOMER_NOTIFICATIONS_LAST_VIEWED_KEY =
  "customerNotificationsLastViewedAt";

export async function getCustomerNotificationsLastViewedAt() {
  return AsyncStorage.getItem(CUSTOMER_NOTIFICATIONS_LAST_VIEWED_KEY);
}

export async function markCustomerNotificationsViewed() {
  const viewedAt = new Date().toISOString();

  await AsyncStorage.setItem(CUSTOMER_NOTIFICATIONS_LAST_VIEWED_KEY, viewedAt);

  return viewedAt;
}

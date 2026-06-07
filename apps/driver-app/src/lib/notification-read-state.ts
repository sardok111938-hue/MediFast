import AsyncStorage from "@react-native-async-storage/async-storage";

const DRIVER_NOTIFICATIONS_LAST_VIEWED_KEY = "driverNotificationsLastViewedAt";

export async function getDriverNotificationsLastViewedAt() {
  return AsyncStorage.getItem(DRIVER_NOTIFICATIONS_LAST_VIEWED_KEY);
}

export async function markDriverNotificationsViewed() {
  const viewedAt = new Date().toISOString();

  await AsyncStorage.setItem(DRIVER_NOTIFICATIONS_LAST_VIEWED_KEY, viewedAt);

  return viewedAt;
}

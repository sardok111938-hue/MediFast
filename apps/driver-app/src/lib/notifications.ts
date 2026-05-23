import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";
import Constants from "expo-constants";

export async function registerDriverPushToken(driverId: string) {
  if (!Device.isDevice) {
    return null;
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermissions.status;

  if (existingPermissions.status !== "granted") {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermissions.status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("orders", {
      name: "Order updates",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  let token: string | null = null;

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
  projectId: Constants.expoConfig?.extra?.eas?.projectId,
});
    token = tokenResponse.data;
  } catch (error) {
    console.log("DRIVER PUSH TOKEN FETCH ERROR", error);
    return null;
  }

  const { error } = await supabase
    .from("drivers")
    .update({ expo_push_token: token })
    .eq("id", driverId);

  if (error) {
    throw error;
  }

  return token;
}
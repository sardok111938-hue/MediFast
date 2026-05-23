import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const MAX_ATTEMPTS = 3;

type QueuedNotification = {
  id: string;
  recipient_role: string;
  recipient_id: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  attempt_count: number;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function nextFailureStatus(notification: QueuedNotification) {
  return notification.attempt_count >= MAX_ATTEMPTS ? "failed" : "queued";
}

async function updateNotification(
  notificationId: string,
  body: Record<string, unknown>,
) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase environment variables.");
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/notifications?id=eq.${notificationId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

async function lookupExpoPushToken(notification: QueuedNotification) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing Supabase environment variables.");
  }

  const table =
    notification.recipient_role === "customer"
      ? "customers"
      : notification.recipient_role === "driver"
        ? "drivers"
        : null;

  if (!table) {
    return null;
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(notification.recipient_id)}&select=expo_push_token`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const rows = await response.json();

  return rows?.[0]?.expo_push_token ?? null;
}

serve(async () => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Missing Supabase environment variables." }, 500);
    }

    const notificationsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/claim_queued_notifications`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          p_limit: 20,
        }),
      },
    );

    const notifications = await notificationsResponse.json();
    if (!notificationsResponse.ok) {
      throw new Error(JSON.stringify(notifications));
    }

    if (!Array.isArray(notifications)) {
      throw new Error("Invalid notifications response.");
    }

    for (const notification of notifications as QueuedNotification[]) {
      try {
        const token = await lookupExpoPushToken(notification);

        if (!token) {
          await updateNotification(notification.id, {
            status: nextFailureStatus(notification),
            error_message: "Missing push token",
          });

          continue;
        }

        const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: token,
            title: notification.title,
            body: notification.body,
            data: notification.data ?? {},
            sound: "default",
            channelId: "orders",
          }),
        });

        const expoData = await expoResponse.json();

        const ticket = Array.isArray(expoData?.data)
          ? expoData.data[0]
          : expoData?.data;

        const isSuccess = expoResponse.ok && ticket?.status === "ok";

        await updateNotification(notification.id, {
          status: isSuccess ? "sent" : nextFailureStatus(notification),
          error_message: isSuccess ? null : JSON.stringify(expoData),
          sent_at: isSuccess ? new Date().toISOString() : null,
        });
      } catch (error) {
        await updateNotification(notification.id, {
          status: nextFailureStatus(notification),
          error_message: error instanceof Error ? error.message : JSON.stringify(error),
        });
      }
    }

    return jsonResponse({
      success: true,
      processed: notifications.length,
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : JSON.stringify(error) },
      500,
    );
  }
});

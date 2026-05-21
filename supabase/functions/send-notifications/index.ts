import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async () => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({
          error: "Missing Supabase environment variables.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const notificationsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/notifications?status=eq.queued&order=created_at.asc&limit=20`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );

    const notifications = await notificationsResponse.json();

    for (const notification of notifications) {
      try {
        let token: string | null = null;

        if (notification.recipient_role === "customer") {
          const customerResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/customers?id=eq.${notification.recipient_id}&select=expo_push_token`,
            {
              headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
            }
          );

          const customers = await customerResponse.json();
          token = customers?.[0]?.expo_push_token ?? null;
        }

        if (notification.recipient_role === "driver") {
          const driverResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/drivers?id=eq.${notification.recipient_id}&select=expo_push_token`,
            {
              headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
            }
          );

          const drivers = await driverResponse.json();
          token = drivers?.[0]?.expo_push_token ?? null;
        }

        if (!token) {
          await fetch(
            `${SUPABASE_URL}/rest/v1/notifications?id=eq.${notification.id}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                status: "failed",
                error_message: "Missing push token",
              }),
            }
          );

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
            data: notification.data,
            sound: "default",
          }),
        });

        const expoData = await expoResponse.json();

        const isSuccess = expoResponse.ok;

        await fetch(
          `${SUPABASE_URL}/rest/v1/notifications?id=eq.${notification.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              status: isSuccess ? "sent" : "failed",
              error_message: isSuccess ? null : JSON.stringify(expoData),
              sent_at: isSuccess ? new Date().toISOString() : null,
            }),
          }
        );
      } catch (error) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/notifications?id=eq.${notification.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              status: "failed",
              error_message:
                error instanceof Error ? error.message : JSON.stringify(error),
            }),
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : JSON.stringify(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
});
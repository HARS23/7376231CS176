import { NextResponse } from "next/server";
import { fetchNotifications } from "../../../src/server/notifications";
import { logEvent } from "../../../src/server/logger";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Number.parseInt(searchParams.get("limit") ?? "10", 10);
  const notificationType = searchParams.get("notification_type");

  try {
    const result = await fetchNotifications({
      page: Number.isNaN(page) || page < 1 ? 1 : page,
      limit: Number.isNaN(limit) || limit < 1 ? 10 : limit,
      notificationType,
    });

    await logEvent(
      "info",
      "api",
      `served notifications page=${result.page} limit=${result.limit} type=${notificationType ?? "all"}`
    );

    return NextResponse.json(result);
  } catch (error) {
    await logEvent(
      "error",
      "handler",
      `failed to fetch notifications for frontend: ${error.message}`
    );

    return NextResponse.json(
      { message: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

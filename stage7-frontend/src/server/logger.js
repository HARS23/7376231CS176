import { getAccessToken } from "./auth";

const LOG_URL = "http://4.224.186.213/evaluation-service/logs";

export async function logEvent(level, packageName, message) {
  try {
    const token = await getAccessToken();

    await fetch(LOG_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stack: "backend",
        level,
        package: packageName,
        message,
      }),
      cache: "no-store",
    });
  } catch (_error) {}
}

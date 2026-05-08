const AUTH_URL = "http://4.224.186.213/evaluation-service/auth";

const authPayload = {
  email: "harshavarthan.cs23@bitsathy.ac.in",
  name: "harshavarthan karunakaran",
  rollNo: "7376231cs176",
  accessCode: "uKaJfm",
  clientID: "c83acce4-a64c-41a1-928e-6522318c9744",
  clientSecret: "xganrgqVYFDSYsZx",
};

let cachedToken = null;
let tokenExpiresAt = 0;

function hasUsableToken() {
  if (!cachedToken || !tokenExpiresAt) {
    return false;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return tokenExpiresAt - nowInSeconds > 30;
}

export async function getAccessToken() {
  if (hasUsableToken()) {
    return cachedToken;
  }

  const response = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(authPayload),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Auth failed with status ${response.status}`);
  }

  const data = await response.json();

  cachedToken = data.access_token;
  tokenExpiresAt = data.expires_in;

  return cachedToken;
}

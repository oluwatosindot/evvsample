const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface FetchOptions extends RequestInit {
  token?: string;
}

async function tryRefreshToken(): Promise<string | null> {
  try {
    const stored = localStorage.getItem("evv-auth");
    if (!stored) return null;
    const { state } = JSON.parse(stored);
    if (!state?.refreshToken) return null;

    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: state.refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    // Update stored auth
    const updated = {
      ...JSON.parse(stored),
      state: {
        ...state,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      },
    };
    localStorage.setItem("evv-auth", JSON.stringify(updated));
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function apiClient<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders as Record<string, string>,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res = await fetch(`${API_URL}${path}`, { headers, ...rest });

  // If 401 and we have a token, try refreshing
  if (res.status === 401 && token) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(`${API_URL}${path}`, { headers, ...rest });
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }

  return res.json();
}

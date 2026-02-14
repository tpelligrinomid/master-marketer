const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GSC_API_BASE = "https://www.googleapis.com/webmasters/v3";

export class GoogleSearchConsoleClient {
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(clientId: string, clientSecret: string, refreshToken: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.refreshToken = refreshToken;
  }

  /**
   * Refresh the access token if expired or within 5-minute buffer.
   */
  private async ensureAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiry - 5 * 60 * 1000) {
      return this.accessToken;
    }

    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `GSC token refresh failed (${response.status}): ${text.slice(0, 500)}`
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };

    this.accessToken = data.access_token;
    this.tokenExpiry = now + data.expires_in * 1000;
    return this.accessToken;
  }

  async get<T>(endpoint: string): Promise<T> {
    const token = await this.ensureAccessToken();
    const url = `${GSC_API_BASE}/${endpoint}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `GSC API error (${response.status}) GET ${endpoint}: ${text.slice(0, 500)}`
      );
    }

    return (await response.json()) as T;
  }

  async post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const token = await this.ensureAccessToken();
    const url = `${GSC_API_BASE}/${endpoint}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `GSC API error (${response.status}) POST ${endpoint}: ${text.slice(0, 500)}`
      );
    }

    return (await response.json()) as T;
  }
}

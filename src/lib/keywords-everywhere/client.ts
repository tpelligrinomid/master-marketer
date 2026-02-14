const KE_API_BASE = "https://api.keywordseverywhere.com/v1";

export class KeywordsEverywhereClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * POST with form-encoded body.
   * Used for endpoints that accept kw[] array notation (e.g. get_keyword_data).
   */
  async post<T>(endpoint: string, params: URLSearchParams): Promise<T> {
    const url = `${KE_API_BASE}/${endpoint}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Accept": "application/json",
      },
      body: params,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Keywords Everywhere API error (${response.status}): ${text.slice(0, 500)}`
      );
    }

    const data = (await response.json()) as T;
    return data;
  }

  /**
   * POST with JSON body.
   * Used for endpoints that accept a single keyword param (e.g. get_related_keywords, get_pasf_keywords).
   */
  async postJson<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const url = `${KE_API_BASE}/${endpoint}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Keywords Everywhere API error (${response.status}): ${text.slice(0, 500)}`
      );
    }

    const data = (await response.json()) as T;
    return data;
  }
}

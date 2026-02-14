const DATAFORSEO_API_BASE = "https://api.dataforseo.com/v3";

export interface DataForSeoResponse<T> {
  version: string;
  status_code: number;
  status_message: string;
  tasks?: Array<{
    id: string;
    status_code: number;
    status_message: string;
    result?: T[];
    result_count?: number;
  }>;
}

export class DataForSeoClient {
  private authHeader: string;

  constructor(login: string, password: string) {
    this.authHeader = `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
  }

  async request<T>(
    method: "GET" | "POST",
    endpoint: string,
    body?: unknown
  ): Promise<DataForSeoResponse<T>> {
    const url = `${DATAFORSEO_API_BASE}/${endpoint}`;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: this.authHeader,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const text = await response.text();
        // Retry on 500/502/503/504 (transient server errors)
        if (response.status >= 500 && attempt < maxAttempts) {
          const delay = attempt * 2000;
          console.warn(
            `[DataForSEO] ${method} ${endpoint} returned ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw new Error(`DataForSEO API error (${response.status}): ${text.slice(0, 500)}`);
      }

      const data = (await response.json()) as DataForSeoResponse<T>;

      if (data.status_code !== 20000) {
        throw new Error(
          `DataForSEO response error (${data.status_code}): ${data.status_message}`
        );
      }

      return data;
    }

    // Should never reach here, but TypeScript needs it
    throw new Error(`DataForSEO request failed after ${maxAttempts} attempts`);
  }

  /**
   * Extract the first task's result array from a DataForSEO response.
   * Returns empty array if no results found.
   */
  extractResults<T>(response: DataForSeoResponse<T>): T[] {
    const task = response.tasks?.[0];
    if (!task || !task.result) return [];
    return task.result;
  }

  /**
   * Extract the first result from the first task.
   * Returns undefined if no result found.
   */
  extractFirstResult<T>(response: DataForSeoResponse<T>): T | undefined {
    const results = this.extractResults(response);
    return results[0];
  }
}

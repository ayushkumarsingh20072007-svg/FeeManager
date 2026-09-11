const API_BASE = '/api/v1';

export class ApiClient {
  private static getHeaders(contentType: boolean = true): HeadersInit {
    const headers: Record<string, string> = {};
    if (contentType) {
      headers['Content-Type'] = 'application/json';
    }
    const token = localStorage.getItem('agent40_access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  public static async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Request failed with status ${res.status}`);
    }
    return res.json();
  }

  public static async post<T>(path: string, body?: any): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Request failed with status ${res.status}`);
    }
    return res.json();
  }

  public static async downloadBlob(path: string, defaultFilename: string = 'download.pdf'): Promise<void> {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers: this.getHeaders(false),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      console.error(`[ApiClient] Download failed with HTTP ${res.status}:`, err);
      throw new Error(err.detail || `Download failed with HTTP ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (defaultFilename.endsWith('.pdf') && !contentType.includes('application/pdf')) {
      console.error(`[ApiClient] Unexpected response content-type: ${contentType}`);
      throw new Error(`Expected PDF response but received '${contentType}' (HTTP ${res.status})`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Extract filename from header if available
    const disposition = res.headers.get('Content-Disposition');
    let filename = defaultFilename;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1].trim();
      }
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 100);
  }

  public static async getHealth(): Promise<any> {
    const res = await fetch('/health');
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  }
}

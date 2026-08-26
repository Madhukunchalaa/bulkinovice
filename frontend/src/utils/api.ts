const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://bulkinovice-production.up.railway.app/api';

/**
 * Standard fetch wrapper that attaches JWT and handles JSON responses.
 */
export async function apiFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Fallback if not json
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Fetches a binary file (ZIP or PDF) and triggers a browser download.
 */
export async function apiDownload(path: string, defaultFilename: string, method = 'GET', body?: any): Promise<void> {
  const token = localStorage.getItem('token');
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = 'Failed to download file';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // Fallback
    }
    throw new Error(errorMessage);
  }

  // Get filename from response header if available
  let filename = defaultFilename;
  const disposition = response.headers.get('Content-Disposition');
  if (disposition && disposition.includes('attachment')) {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const matches = filenameRegex.exec(disposition);
    if (matches != null && matches[1]) {
      filename = matches[1].replace(/['"]/g, '');
    }
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  // Clean up
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

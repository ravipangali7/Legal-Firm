/**
 * Load Google Identity Services and request an OAuth access token (user gesture required).
 * The token is sent to the API for verification via Google's userinfo endpoint.
 */

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type WindowWithGoogle = Window & {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient: (cfg: {
          client_id: string;
          scope: string;
          prompt?: string;
          callback: (r: GoogleTokenResponse) => void;
          error_callback?: () => void;
        }) => { requestAccessToken: (overrideConfig?: Record<string, unknown>) => void };
      };
    };
  };
};

export function loadGoogleGsiScript(): Promise<void> {
  const w = window as WindowWithGoogle;
  if (w.google?.accounts?.oauth2) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const finish = () => {
      if (w.google?.accounts?.oauth2) resolve();
      else reject(new Error('Google Sign-In is unavailable.'));
    };

    let script = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => queueMicrotask(finish);
      script.onerror = () => reject(new Error('Failed to load Google Sign-In.'));
      document.head.appendChild(script);
      return;
    }

    if (w.google?.accounts?.oauth2) {
      queueMicrotask(finish);
      return;
    }
    script.addEventListener('load', () => queueMicrotask(finish), { once: true });
    script.addEventListener('error', () => reject(new Error('Google Sign-In script failed.')), { once: true });
  });
}

export function requestGoogleAccessToken(
  clientId: string,
  callback: (response: GoogleTokenResponse) => void,
  errorCallback?: () => void,
): void {
  const w = window as WindowWithGoogle;
  if (!w.google?.accounts?.oauth2) {
    callback({ error: 'not_loaded' });
    return;
  }
  const client = w.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'openid email profile',
    prompt: 'select_account',
    callback,
    error_callback: errorCallback,
  });
  client.requestAccessToken();
}

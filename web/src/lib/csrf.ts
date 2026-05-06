/** Read cookie value by name (used for Django CSRF token). */
export function getCookie(name: string): string | undefined {
  const row = document.cookie.split('; ').find((r) => r.startsWith(`${name}=`));
  return row?.split('=').slice(1).join('=');
}

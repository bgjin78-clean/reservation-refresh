/** 로그인·데이터 접근이 허용된 Google 계정 */
export const ALLOWED_EMAILS = ['jjubu10@gmail.com', 'bg.jin78@gmail.com'] as const;

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ALLOWED_EMAILS.some((allowed) => allowed.toLowerCase() === normalized);
}

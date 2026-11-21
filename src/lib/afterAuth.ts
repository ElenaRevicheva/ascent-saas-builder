// Pages that send people to sign in and get them back afterwards (Auth ?next=, AuthConfirm). Only these - no open redirect.
// 21 Nov 2026 (Elena: Pro English "try it" -> sign in -> landed on the general dashboard, stuck).
export const AFTER_AUTH_PAGES: string[] = ['/classroom', '/classroom-ru', '/pro-english', '/road'];

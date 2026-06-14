/* Edge-safe auth constants. No server-only / node deps, so this module is
 * importable from middleware (edge runtime) as well as the Node data layer. */

export const SESSION_COOKIE = "pt_session";

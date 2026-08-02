// Authentik OIDC config (public PKCE client). Issuer + client id must match the Authentik `assistant` provider.

export const OIDC_ISSUER = 'https://auth.lupira.com/application/o/assistant/';

/** Public client id — also the token `aud` the API validates. */
export const OIDC_CLIENT_ID = 'lupira-assistant';

/** `offline_access` requests a refresh token so the session survives without re-login. */
export const OIDC_SCOPES = ['openid', 'email', 'profile', 'offline_access'];

export const OIDC_SCHEME = 'lupiraassistant';

/** Non-empty path required: a bare scheme normalizes away and expo-auth-session can't match it. */
export const OIDC_REDIRECT_PATH = 'oauthredirect';

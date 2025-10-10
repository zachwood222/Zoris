# Deployment Runbook

This document captures the operational steps and configuration toggles required to run the
Zoris API in staging and production environments.

## Authentication configuration

The API enforces role-based authorization for any route that uses the `require_roles`
dependency. Authentication behaviour is controlled via environment variables that are
parsed by `app.api.config.Settings`. The following knobs are the most relevant when
operating the service:

- **`AUTH_PROVIDER`** – Selects the authentication backend. Supported values:
  `jwks`, `shared_secret`, `mock` (local development only).
- **`AUTH_SHARED_SECRET`** – Symmetric signing key used when
  `AUTH_PROVIDER=shared_secret`. Rotate regularly and store in the secret manager.
- **`AUTH_JWKS_URL`** – HTTPS endpoint for fetching JWKS documents when
  `AUTH_PROVIDER=jwks`.
- **`AUTH_JWKS_CACHE_SECONDS`** – TTL for cached JWKS responses. Tune to balance
  responsiveness to key rotation versus outbound traffic.
- **`AUTH_JWKS_STATIC`** – Optional JWKS JSON payload for offline environments
  (e.g., automated tests).
- **`AUTH_ALGORITHMS`** – Comma-separated list of allowed JWT algorithms (default
  `RS256`).
- **`AUTH_AUDIENCE` / `AUTH_ISSUER`** – Optional hard requirements for the JWT
  `aud` and `iss` claims.
- **`AUTH_ROLES_CLAIM`** – Dot-delimited path locating the provider roles inside
  the token payload.
- **`AUTH_ROLE_MAPPING`** – JSON object that maps provider role identifiers to
  internal role names.
- **`AUTH_DEFAULT_ROLES`** – Comma-separated list of roles automatically granted
  to every authenticated user.
- **`AUTH_USER_ID_CLAIM`** – Claim path that becomes the internal `User.id`.
- **`AUTH_REQUIRE_EXP`** – When `true`, reject tokens lacking an `exp` claim.

> **Important:** The `mock` provider is only allowed in the `local` environment. Deployments to
> staging and production must use either `jwks` (recommended for Clerk/Supabase) or
> `shared_secret`.

### Integrating with a JWKS provider

1. Create an application in the identity provider (e.g., Clerk) and note the JWKS endpoint.
2. Set `AUTH_PROVIDER=jwks`, `AUTH_JWKS_URL=<provider JWKS url>`, and, if required,
   `AUTH_AUDIENCE`/`AUTH_ISSUER` so the backend can validate tokens.
3. Configure `AUTH_ROLE_MAPPING` to translate provider-specific roles into the internal
   names referenced throughout the codebase (e.g., `{ "org:owner": ["Admin"] }`).
4. Deploy the configuration and restart the API pods. JWKS responses are cached based on
   `AUTH_JWKS_CACHE_SECONDS`; lowering the value temporarily helps during key rotation.

### Shared-secret deployments

For smaller environments without a JWKS endpoint, set `AUTH_PROVIDER=shared_secret` and
`AUTH_SHARED_SECRET=<random value>`. The secret must be stored in your secret management
system (e.g., AWS Secrets Manager or Doppler) and injected into the runtime environment.

To rotate the shared secret:

1. Generate a new random 256-bit key.
2. Update the secret manager entry used by the deployment.
3. Redeploy the API so new pods load the updated value. Tokens signed with the previous
   secret become invalid immediately.

### Mapping roles

Tokens often encode provider roles that do not match the application domain. Use
`AUTH_ROLE_MAPPING` to translate these claims. Example configuration:

```json
{
  "clerk:purchasing": ["Purchasing"],
  "clerk:driver": ["Driver", "Floor"],
  "clerk:finance": "AP"
}
```

Every authenticated user will also receive the roles from `AUTH_DEFAULT_ROLES`.

### Monitoring and troubleshooting

- `invalid_token` or `missing_token` responses (HTTP 401) indicate failed authentication.
  Check the Authorization header and ensure the token is signed with the active key.
- `insufficient_role` (HTTP 403) means the user authenticated successfully but lacks the
  roles required by the route. Update `AUTH_ROLE_MAPPING` or grant the user additional
  roles in the identity provider.
- `jwks_fetch_error` shows the API could not reach the JWKS endpoint or parse the response.
  Confirm outbound connectivity and that the JWKS payload is valid JSON.

For staging/production, ensure application logs are shipped to the centralized logging
system so operators can audit authentication failures.

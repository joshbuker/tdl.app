# Live-update authentication

## Context

Open apps hear about new sync data over a websocket, `GET /api/sync/ws` (see [Custom sync](custom-sync.md)). It only carries feed positions, never task content. The web app in a browser is served from the server's own origin and sends its session as an httpOnly cookie; Android, iOS, Electron and other native clients send it as a bearer token (see [Server-side sessions](server-side-sessions.md)).

No browser engine lets page scripts set headers on a WebSocket, and the Capacitor webviews (Android, iOS) and Electron's window are browser engines. The WHATWG proposal to allow it has been open since 2017, with Chrome's WebSocket maintainers opposed. Cookies don't fill the gap: the Capacitor apps run at `https://localhost` and `capacitor://localhost`, so the server's cookie is third-party there, and iOS only allows third-party cookies for at most 10 domains fixed at build time, which can't cover self-hosted servers (see [Choose a server](../features/account/choose-server.md)).

OWASP's WebSocket Security Cheat Sheet says that for browser clients using tokens, prefer sending the token in the first message, and avoid tokens in URL query strings. OWASP ASVS 5.0 section 4.4 asks for an `Origin` allow-list checked on the handshake, and for dedicated tokens obtained through the authenticated HTTPS session when normal session management can't be used. Discord, Home Assistant and Mattermost authenticate in the first message.

## Decision

- **Cookie at the handshake** for the web app in a browser, as before. Cookie connections accept only the server's own `Origin`, which stops other sites using a visitor's cookie (cross-site WebSocket hijacking).
- **Session token in the first message** for every client with a bearer token. The socket opens without credentials, and the client sends `{ "type": "auth", "token": "<session token>" }`. Until that's valid, the server sends nothing and reads nothing else, and closes the socket if it doesn't arrive within a few seconds. Unauthenticated sockets are capped per network address, and message contents are never logged.
- **Origin allow-list for token connections:** the server's own origin, the Capacitor apps' origins (`https://localhost`, `capacitor://localhost`), Electron's window origin, or none (native clients). It follows ASVS 4.4.2. Custom clients can send any `Origin`, so it's no defence against them, and doesn't need to be: without a valid token they get nothing. App origins are never accepted for cookie connections, so a page served on the user's own machine at `localhost` can't borrow their web session.
- **Closing sockets:** a session's sockets close when it's revoked, logged out or expired. Open sockets re-check their session periodically (every 30 minutes, as the cheat sheet suggests).

## Alternatives considered

- **One-use ticket in the URL** (`/api/sync/ws?ticket=…`, fetched from a new endpoint): matches ASVS 4.4.4 and Slack's approach, but puts a credential in the URL, which OWASP advises against and nginx logs by default. Sending the ticket in the first message instead adds an endpoint and a request per reconnect, for no gain over the session token the client already sends on every push and pull.
- **Token in the `Sec-WebSocket-Protocol` header** (as Kubernetes does): no endpoint or extra request, but misuses the header, isn't covered by OWASP, and puts the long-lived token in a header some proxies log.
- **Streamed HTTP response (server-sent events read with `fetch`)** instead of a websocket, close to what Google's Firestore does: `fetch` can send the `Authorization` header. Would rewrite the built socket route, conflicts with Capacitor's native HTTP mode (which doesn't stream), and has a six-connection limit per server over HTTP/1.1. Kept in reserve in case some networks block websockets.
- **Cookies in the webviews:** reverses the bearer-token decision for native apps, and can't work on iOS with self-hosted servers.
- **A native websocket on mobile** (a Capacitor plugin that sets headers): native code on two platforms for what a message does.
- **No live socket on mobile** (sync on open, on a timer and on push): not live, against the stack constraint.
- **Electron's socket in its Node process** (where headers work): unnecessary once the window can authenticate by message.

## Consequences

- One token code path for Android, iOS, Electron and other clients, and no credential in URLs or headers.
- The socket has a not-yet-authenticated state to build and test, and the session check moves from the route's `preValidation` into message handling for token connections.
- The HTTP transport no longer passes headers to the `WebSocket` constructor (which throws in browsers).
- Electron's window origin (possibly `null` for a page loaded from a file) is confirmed when the Electron app is built.
- Unrelated to the socket but found alongside it: the Capacitor apps' push and pull requests are cross-origin, so CORS must allow their origins with the `Authorization` header.

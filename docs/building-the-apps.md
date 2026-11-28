# Building the apps

The web, Android and desktop apps are builds of the same client in `apps/client`.

## The server address

`TDL_SERVER_URL` is the server the Android and desktop apps talk to. It is read when you build, and defaults to `https://tdl.app`. The web build ignores it: the web app is served by its server, so it uses its own origin.

```sh
TDL_SERVER_URL=http://localhost:3000 pnpm --filter @tdl/client build
```

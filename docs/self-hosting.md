# Self-hosting

How to run your own TDL App server: the server and its Postgres database, as two containers started with Docker Compose. Why self-hosting is supported, and what it covers, is in [Self-hosting](design-decisions/self-hosting.md).

## Requirements

- A Linux machine with Docker Engine 25 or later and the Docker Compose plugin (`docker compose`, 2.20 or later).
- A domain name for the server, e.g. `tasks.example.com`, pointing at the machine.
- A reverse proxy that serves HTTPS, such as Caddy or nginx (see [Reverse proxy and HTTPS](#reverse-proxy-and-https)).
- A copy of this repository. There's no published image yet, so Compose builds it from the source: check out a release tag (see [Releases and CI](design-decisions/releases-and-ci.md)).

## Configuration

Create a file named `.env` next to `compose.yaml`. Compose reads it when it starts the containers. Keep it private: it holds the database password and the secret that signs sessions.

```sh
POSTGRES_PASSWORD=<output of: openssl rand -hex 32>
AUTH_SECRET=<output of: openssl rand -base64 32>
ORIGIN=https://tasks.example.com
TRUST_PROXY=true
```

| Variable | Required | Meaning |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | Yes | The database password. Compose sets it when it first creates the database. Use letters and digits only (`openssl rand -hex 32`), since it's also put in the database URL. |
| `AUTH_SECRET` | Yes | At least 32 characters. Signs sessions; changing it signs everyone out. |
| `ORIGIN` | Yes | The public URL people use to reach the server, exactly as the browser shows it, with no trailing slash. Sign-in, cookies and live updates are tied to it: with an `https://` origin, session cookies are only sent over HTTPS, and the live-update socket refuses connections from web pages on any other origin. |
| `TRUST_PROXY` | No (default `false`) | `true` when the server is behind a reverse proxy, so it takes the client's address from the proxy's `X-Forwarded-For` header. Rate limits on signing up and signing in use that address. Set it only if nothing but the proxy can reach the server's port, and the proxy replaces any `X-Forwarded-For` the client sent with the client's own address. The server uses the first address in the header, so a proxy that appends to it lets clients pick their own address and get around the rate limits. |
| `DATABASE_URL` | No | Only to use a Postgres server of your own instead of the `db` container, e.g. `postgres://tdl:<password>@db.internal:5432/tdl`. |
| `TDL_PORT` | No (default `3000`) | The port the server listens on, on `127.0.0.1` of the host. |

## Starting the server

```sh
docker compose up -d
```

The first run builds the server image, which takes a few minutes. The server waits for the database to be healthy, then applies any database migrations before it starts listening, so a new install and an upgrade start the same way.

Check that it's running:

```sh
docker compose ps                        # both services "healthy"
curl http://127.0.0.1:3000/health        # {"ok":true}
docker compose logs server               # if it isn't
```

The server's port is published on `127.0.0.1` only, so nothing outside the machine reaches it except through the reverse proxy.

## Reverse proxy and HTTPS

Put a reverse proxy in front of the server that serves HTTPS for your domain and forwards everything to `http://127.0.0.1:3000`. HTTPS is needed: session cookies are marked `Secure`, so browsers won't send them over plain HTTP. The proxy must:

- **Forward websockets.** Apps get live updates over a websocket at `/sync/ws`, so the proxy must pass on the `Upgrade` and `Connection` headers. Without them, live updates don't work.
- **Keep `Host` and `Origin` as the browser sent them.** The server checks a browser's `Origin` against `ORIGIN` and refuses the websocket if they differ, so the proxy must not rewrite it.
- **Set `X-Forwarded-For` and `X-Forwarded-Proto`**, and set `TRUST_PROXY=true` in `.env`. `X-Forwarded-For` must be overwritten with the client's address, not appended to: the server trusts its first address, which a client could otherwise choose.
- **Not time out idle websockets quickly.** The live-update socket can be quiet for a long time, and a short timeout closes it needlessly.

### Caddy

Caddy gets HTTPS certificates itself, and forwards websockets and the headers above by default. It replaces an `X-Forwarded-For` sent by the client, unless you configure it to trust other proxies in front of it:

```caddyfile
tasks.example.com {
	reverse_proxy 127.0.0.1:3000
}
```

### nginx

With a certificate from e.g. Certbot:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl;
    server_name tasks.example.com;
    ssl_certificate     /etc/letsencrypt/live/tasks.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tasks.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 1h;
    }
}
```

nginx passes the `Origin` header on unchanged unless told otherwise. Don't use `$proxy_add_x_forwarded_for` here: it appends to the client's own `X-Forwarded-For`.

If the proxy runs in a container rather than on the host, it can't reach `127.0.0.1` of the host. Put it on the same Compose network instead, forward to `http://server:3000`, and remove the `ports` section from `compose.yaml`.

## Backups

Back up the database regularly, and keep copies off the machine (see [Server backups](design-decisions/server-backups.md)). Backups hold everyone's tasks in readable form, so encrypt them before they leave the server (e.g. with `age` or `gpg`), and restrict who can read them.

`pg_dump` makes a consistent backup while the server keeps running:

```sh
docker compose exec -T db pg_dump --username=tdl --dbname=tdl --format=custom > tdl-$(date +%F).dump
```

Test restoring your backups now and then, e.g. into a copy of the setup on another machine.

### Restoring

Restoring replaces everything in the database with the backup. Stop the server, recreate the database empty, load the backup, and start the server again:

```sh
docker compose stop server
docker compose exec -T db dropdb --username=tdl tdl
docker compose exec -T db createdb --username=tdl tdl
docker compose exec -T db pg_restore --username=tdl --dbname=tdl --no-owner < tdl-2026-11-12.dump
docker compose start server
```

If the backup is from an older version of TDL App, the server applies the newer migrations when it starts.

**A restore can bring back data that was deleted after the backup was taken**, such as deleted accounts or permanently deleted tasks. Deletion leaves nothing behind to reapply, so after a restore, go through the deletions made since the backup (e.g. account deletion requests) and carry them out again.

Apps that synced after the backup was taken don't yet notice that the server went back in time, and can miss changes made after the restore. How they'll recover is an open question (see [Open items](open-items.md)); until then, have everyone sign out of the apps, clear their local data, and sign in again after a restore.

## Upgrading

1. Read the release notes for the version you're moving to, including which sync protocol version it supports.
2. Back up the database (above).
3. Check out the new release tag, and rebuild and restart:

   ```sh
   git fetch --tags && git checkout <tag>
   docker compose up -d --build
   ```

The server applies any new migrations when it starts. Migrations only move forward: to go back to an older version, restore the backup taken before upgrading.

Postgres itself is upgraded separately. A new Postgres major version can't read the old one's data directory, so moving between majors (e.g. 18 to 19) means a backup with `pg_dump`, a new, empty `db` volume on the new version, and a restore.

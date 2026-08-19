# Deploying Lingoza on an Oracle Cloud VPS

The goal: the Telegram bot answers 24/7 whether or not your Mac is on. That means the API lives on the VPS with a permanent HTTPS URL, and Telegram's webhook points at that URL forever — no tunnel, no session to expire.

The whole stack is three containers:

```
              :443 ┌──────────┐
Internet ──────────│  caddy   │  automatic Let's Encrypt certificate
                   └────┬─────┘
                        │ :4000
                   ┌────┴─────┐
                   │   api    │  REST + Telegram webhook + the web SPA
                   └────┬─────┘
                        │ :5432
                   ┌────┴─────┐
                   │    db    │  Postgres, on a named volume
                   └──────────┘
```

---

## 0. Creating the instance

### Shape — this is where the free tier is won or lost

Oracle's **Always Free** compute is only these two:

| Shape | CPU | What it is |
|---|---|---|
| **`VM.Standard.A1.Flex`** | Ampere, **arm64** | Up to 4 OCPU / 24 GB free forever. **Use this one.** |
| `VM.Standard.E2.1.Micro` | AMD, x86_64 | 1/8 OCPU / 1 GB. Too small — image builds get OOM-killed. |

Everything else, including **`VM.Standard.E5.Flex`**, is billed — around $30–45/month at 1 OCPU / 12 GB.

Recommended: **Change shape → Ampere → VM.Standard.A1.Flex**, then 2 OCPU / 12 GB. Free, and faster than the paid E5 config it replaces.

Either architecture works — the Prisma client bundles both x86_64 and arm64 query engines — but build the image *on the instance* so the architecture is never in question.

### Image — pick Ubuntu

The default is Oracle Linux 9, which ships **Podman rather than Docker**, and Docker CE has no official OL9 repository. Installing it means adding the CentOS repo and resolving `podman`/`runc` conflicts.

**Change image → Canonical Ubuntu → 24.04.** Then Docker installs in one command.

If you must stay on Oracle Linux 9:

```bash
sudo dnf install -y dnf-utils
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y --allowerasing docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER && newgrp docker
```

### Networking — give Lingoza its own VCN

The wizard offers to reuse an existing virtual cloud network. Don't, if that VCN belongs to another project.

This deployment needs ports 80 and 443 open, and a **security list rule applies to every instance in the subnet**. Opening them on a shared network changes the firewall for whatever else lives there. VCNs cost nothing, so isolation is free.

- **Primary network** → *Create new virtual cloud network* → name it `lingoza-vcn`
- **Subnet** → *Create new public subnet* → name it `lingoza-public-subnet`
- Leave *Automatically assign public IPv4 address* **enabled**. Without a public IP nothing can reach the instance, and adding one later means recreating the VNIC.

Oracle creates the VCN, subnet, internet gateway and route rule together, so the network is ready to use immediately.

If you must share an existing VCN, attach a **Network Security Group** to this instance instead of editing the subnet's security list — NSG rules bind to one VNIC rather than the whole subnet.

### The rest of the wizard

- **Add SSH keys** — *Save the private key when the browser offers it.* There is no second chance; losing it means rebuilding the instance.
- **Boot volume** — the 50 GB default is fine (200 GB is free in total).

### After it boots

- An **A record** for your domain pointing at the instance's public IP. This is not optional: Telegram only delivers webhooks over HTTPS with a valid certificate, and certificates need a real hostname. A cheap `.com` works; so does a free subdomain from [DuckDNS](https://duckdns.org) or [Afraid.org](https://freedns.afraid.org).

```bash
dig +short lingoza.example.com     # must print your instance's public IP
```

---

## 1. Open ports 80 and 443 — *both* layers

This is the step that catches almost everyone on Oracle Cloud: there are **two independent firewalls**, and opening only one leaves the port silently closed.

### Layer 1 — the VCN security list (in the Oracle console)

Networking → Virtual Cloud Networks → your VCN → Subnet → Security List → **Add Ingress Rules**:

| Source CIDR | IP protocol | Destination port |
|---|---|---|
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |

### Layer 2 — the firewall on the instance itself

Oracle's images ship with restrictive local rules that persist regardless of the console settings.

**Ubuntu images:**

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save          # survives reboot
```

**Oracle Linux images:**

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

Verify from your Mac (not from the instance — it would answer itself):

```bash
nc -zv lingoza.example.com 443
```

---

## 2. Install Docker on the instance

On Ubuntu (the recommended image):

```bash
ssh ubuntu@YOUR_INSTANCE_IP      # user is `opc` on Oracle Linux

curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker                      # or log out and back in

docker --version && docker compose version
```

On Oracle Linux 9, use the `dnf` sequence from §0 instead.

If the instance has less than 2 GB of RAM (the `E2.1.Micro` shape), add swap so the image build does not get OOM-killed — an A1.Flex with 12 GB does not need this:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 3. Get the code onto the instance

```bash
git clone <your-repo-url> lingoza && cd lingoza
```

If the repo is not on a git host yet, copy it up directly:

```bash
# from your Mac, in the project directory
rsync -av --exclude node_modules --exclude dist --exclude .git \
      ./ ubuntu@YOUR_INSTANCE_IP:~/lingoza/
```

Build **on the instance**. The Prisma client bundles engines for both architectures, but building on the target removes CPU architecture from the list of things that can go wrong.

---

## 4. Configure the environment

Create `.env` **next to `docker-compose.yml` on the instance**. Compose reads this file for `${...}` substitution.

```bash
cat > .env <<'EOF'
DOMAIN=lingoza.example.com

POSTGRES_USER=lingoza
POSTGRES_DB=lingoza
POSTGRES_PASSWORD=REPLACE_WITH_A_LONG_RANDOM_STRING

JWT_SECRET=REPLACE_WITH_ANOTHER_LONG_RANDOM_STRING

TELEGRAM_BOT_TOKEN=123456789:AA...
TELEGRAM_WEBHOOK_SECRET=REPLACE_WITH_A_THIRD_RANDOM_STRING

GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
EOF

chmod 600 .env
```

Generate the secrets rather than inventing them:

```bash
openssl rand -hex 32
```

Use **hex, not base64**, for `TELEGRAM_WEBHOOK_SECRET`: Telegram only accepts
`A-Z`, `a-z`, `0-9`, `_` and `-` in that field, and base64 emits `+`, `/` and
`=`. `setWebhook` then fails with *"secret token contains unallowed
characters"*, which does not name the offending field.

`docker-compose.yml` deliberately fails fast if `DOMAIN`, `JWT_SECRET` or `POSTGRES_PASSWORD` is missing — a stack that starts with a default secret is worse than one that refuses to start.

---

## 5. Start it

```bash
docker compose up -d --build
docker compose logs -f api
```

On first start the API container will:

1. run `prisma migrate deploy` (applies the committed migration),
2. seed the curriculum — which first **verifies** it and aborts on any error,
3. start serving.

Expect to see `✓ 34 lessons across 6 courses` and then the startup banner.

Check it from your Mac:

```bash
curl https://lingoza.example.com/health
```

Certificate issuance takes a few seconds on the first request. If it fails, the cause is almost always step 1 — port 80 must be reachable for the HTTP-01 challenge, not just 443.

---

## 6. Point Telegram at it

From your Mac, or from the instance:

```bash
curl -F "url=https://lingoza.example.com/api/telegram/webhook" \
     -F "secret_token=YOUR_TELEGRAM_WEBHOOK_SECRET" \
     "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook"
```

Or, from inside the instance where the env is already set:

```bash
docker compose exec api npx tsx apps/api/src/telegram/register.ts
```

Confirm Telegram is happy:

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

`"pending_update_count": 0` and an empty `last_error_message` mean it is delivering. A `last_error_message` of `SSL error` means the certificate is not valid yet; `Connection refused` means a firewall layer is still closed.

Now message the bot `/start`. **This works with your Mac shut down** — that was the point.

---

## Day-to-day operations

| Task | Command |
|---|---|
| Deploy a change | `git pull && docker compose up -d --build` |
| Logs | `docker compose logs -f api` |
| Restart | `docker compose restart api` |
| Stop everything | `docker compose down` (data survives — it is in a volume) |
| Database shell | `docker compose exec db psql -U lingoza lingoza` |
| Re-run the seed | `docker compose exec api npx tsx prisma/seed.ts` |

### Backups

The database lives in the `lingoza_db-data` volume. Back it up on a schedule — a VPS is not a backup.

```bash
docker compose exec -T db pg_dump -U lingoza lingoza | gzip > lingoza-$(date +%F).sql.gz
```

A nightly cron job:

```bash
crontab -e
# 0 3 * * * cd ~/lingoza && docker compose exec -T db pg_dump -U lingoza lingoza | gzip > ~/backups/lingoza-$(date +\%F).sql.gz
```

Restore:

```bash
gunzip -c lingoza-2026-08-15.sql.gz | docker compose exec -T db psql -U lingoza lingoza
```

### Changing the schema later

```bash
# on your Mac, against the dev database
npm run db:migrate -- --name add_something

# commit the generated prisma/migrations/… directory, then on the instance
git pull && docker compose up -d --build
```

The container runs `migrate deploy` on start, so the migration applies itself. `migrate deploy` never generates or guesses a migration and never drops data — which is why it is safe to run automatically.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `getWebhookInfo` shows `SSL error` | Certificate not issued. Port 80 must be open for the ACME challenge, not only 443. |
| `getWebhookInfo` shows `Connection refused` | One of the two firewall layers is still closed. Re-check §1 — the instance-level rules are the ones usually missed. |
| Bot silent, no webhook errors | Wrong `TELEGRAM_WEBHOOK_SECRET`: the API answers 403 and Telegram reports success. Compare the value in `.env` with the one used in `setWebhook`. |
| `POSTGRES_PASSWORD must be set` | `.env` is not next to `docker-compose.yml`, or you ran compose from another directory. |
| Build killed around "transforming" | Out of RAM. Add swap (§2). |
| `exec format error` | Image built for the wrong architecture. Build on the instance. |

---

## Cost

With `VM.Standard.A1.Flex` (Ampere, 2 OCPU / 12 GB) the whole stack — VM, 50 GB boot volume, egress — sits inside Oracle's Always Free allowance. The only running costs are your domain and, if you enable it, Gemini API usage.

Switching to a paid shape such as `VM.Standard.E5.Flex` adds roughly $30–45/month for no benefit at this scale.

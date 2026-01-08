Param(
  [string]$ServerHost="1.12.247.194",
  [int]$Port=22,
  [string]$User="ubuntu",
  [string]$ServerRoot="/home/ubuntu/thinkos",
  [int]$AppPort=5001
)
$ErrorActionPreference="Stop"
npm run build
ssh -p $Port "${User}@${ServerHost}" "mkdir -p $ServerRoot $ServerRoot/server-config"
scp -P $Port -r . "${User}@${ServerHost}:${ServerRoot}/"
scp -P $Port ./server-config/nginx.conf "${User}@${ServerHost}:${ServerRoot}/server-config/nginx.conf"
ssh -p $Port "${User}@${ServerHost}" "bash -lc 'set -e; \
  sudo pkill -f \"python.*$AppPort\" || true; \
  if ! command -v nginx >/dev/null 2>&1; then (sudo apt-get update && sudo apt-get install -y nginx) || (sudo yum install -y epel-release && sudo yum install -y nginx) || (sudo apk add --no-cache nginx); fi; \
  sudo mkdir -p /etc/nginx/conf.d; \
  sudo mv -f $ServerRoot/server-config/nginx.conf /etc/nginx/conf.d/thinkos.conf; \
  sudo nginx -t; \
  pgrep nginx >/dev/null || sudo nginx; \
  sudo nginx -s reload || true; \
  ss -tulnp | grep $AppPort || netstat -tuln | grep $AppPort; \
  curl -I http://localhost:$AppPort/ | head -n 1 || true \
'"

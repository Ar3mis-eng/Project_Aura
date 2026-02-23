#!/bin/bash
set -e

cd /var/www

echo "==> Clearing old cache..."
php artisan config:clear

echo "==> Running migrations..."
php artisan migrate --force --no-interaction

echo "==> Seeding database..."
php artisan db:seed --force --no-interaction

echo "==> Caching config and routes..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "==> Configuring nginx on port ${PORT:-8000}..."
export PORT=${PORT:-8000}
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

echo "==> Starting nginx + PHP-FPM..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf

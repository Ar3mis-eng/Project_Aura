#!/usr/bin/env bash
set -e

echo "Installing Composer dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction

echo "Clearing caches..."
php artisan config:clear
php artisan cache:clear
php artisan view:clear

echo "Running database migrations..."
php artisan migrate --force --no-interaction

echo "Seeding demo data..."
php artisan db:seed --force --no-interaction

echo "Creating storage symlink..."
php artisan storage:link

echo "Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "Build completed successfully!"

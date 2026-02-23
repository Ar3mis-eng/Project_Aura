FROM php:8.2-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libpq-dev \
    default-libmysqlclient-dev \
    zip \
    unzip \
    ca-certificates

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions (MySQL + PostgreSQL)
RUN docker-php-ext-install pdo_mysql pdo_pgsql pgsql mbstring exif pcntl bcmath gd

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy application files
COPY . .

# Install dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Set permissions
RUN chown -R www-data:www-data /var/www \
    && chmod -R 755 /var/www/storage \
    && chmod -R 755 /var/www/bootstrap/cache

# Expose port
EXPOSE 8000

# NOTE: Render's Docker free plan ignores render.yaml startCommand/postdeploy,
# so migrations and seeding must run here at container start.
CMD php artisan config:clear && \
    php artisan migrate --force --no-interaction && \
    php artisan db:seed --force --no-interaction && \
    php artisan serve --host=0.0.0.0 --port=${PORT:-8000}

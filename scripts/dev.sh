#!/bin/bash

# PeepoPay Development Start Script
# Starts all services in development mode

set -e

echo "🚀 Starting PeepoPay in development mode..."

# Ensure Docker services are running
if ! docker ps | grep -q peepopay-postgres-dev; then
    echo "🐳 Starting Docker services..."
    docker-compose -f docker-compose.dev.yml up -d
    echo "⏳ Waiting for services to be ready..."
    sleep 5
fi

# Start all packages in development mode
echo "📦 Starting all packages..."
npm run dev

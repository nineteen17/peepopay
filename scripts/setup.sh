#!/bin/bash

# PeepoPay Development Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up PeepoPay development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment files if they don't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual credentials"
fi

if [ ! -f packages/api/.env ]; then
    echo "📝 Creating API .env file..."
    cp packages/api/.env.example packages/api/.env
fi

if [ ! -f packages/dashboard/.env ]; then
    echo "📝 Creating Dashboard .env file..."
    cp packages/dashboard/.env.example packages/dashboard/.env
fi

if [ ! -f packages/widget/.env ]; then
    echo "📝 Creating Widget .env file..."
    cp packages/widget/.env.example packages/widget/.env
fi

# Start Docker services
echo "🐳 Starting Docker services (PostgreSQL & Redis)..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Run database migrations
echo "🗄️  Running database migrations..."
cd packages/api
npm run db:generate
npm run db:migrate
cd ../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "1. Update .env files with your actual credentials (Stripe, Google OAuth, etc.)"
echo "2. Run 'npm run dev' to start all services"
echo "3. Access the application:"
echo "   - Dashboard: http://localhost:3000"
echo "   - API: http://localhost:4000"
echo "   - Widget: http://localhost:5173"
echo ""
echo "🔗 Useful commands:"
echo "   npm run dev          - Start all services in development mode"
echo "   npm run build        - Build all packages"
echo "   npm run docker:up    - Start Docker services"
echo "   npm run docker:down  - Stop Docker services"
echo ""

#!/bin/bash

# LabSyncPro Mail Server Setup Script
echo "🚀 Setting up LabSyncPro Mail Server..."

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p docker-data/dms/mail-data
mkdir -p docker-data/dms/mail-state
mkdir -p docker-data/dms/mail-logs
mkdir -p docker-data/dms/config
mkdir -p docker-data/mysql
mkdir -p docker-data/roundcube/www
mkdir -p docker-data/roundcube/config

# Set permissions
echo "🔐 Setting permissions..."
chmod -R 755 docker-data/

# Start the mail server
echo "🐳 Starting Docker containers..."
docker-compose -f docker-compose.mail.yml up -d

# Wait for containers to start
echo "⏳ Waiting for containers to initialize..."
sleep 30

# Create email accounts for LabSyncPro users
echo "📧 Creating email accounts..."

# Admin account
docker exec labsync-mailserver setup email add admin@labsync.local admin123

# Sample instructor accounts
docker exec labsync-mailserver setup email add instructor1@labsync.local instructor123
docker exec labsync-mailserver setup email add instructor2@labsync.local instructor123

# Sample student accounts
docker exec labsync-mailserver setup email add student1@labsync.local student123
docker exec labsync-mailserver setup email add student2@labsync.local student123

# Create aliases
echo "📮 Creating email aliases..."
docker exec labsync-mailserver setup alias add noreply@labsync.local admin@labsync.local
docker exec labsync-mailserver setup alias add support@labsync.local admin@labsync.local

echo "✅ Mail server setup complete!"
echo ""
echo "🌐 Access Points:"
echo "   Webmail (Roundcube): http://localhost:8080"
echo "   Admin Panel: http://localhost:8081"
echo "   SMTP Server: localhost:587"
echo "   IMAP Server: localhost:143"
echo ""
echo "📧 Test Accounts:"
echo "   admin@labsync.local / admin123"
echo "   instructor1@labsync.local / instructor123"
echo "   student1@labsync.local / student123"
echo ""
echo "🔧 To add more users:"
echo "   docker exec labsync-mailserver setup email add user@labsync.local password"
echo ""
echo "📱 Configure your email client with:"
echo "   IMAP: localhost:143 (or 993 for SSL)"
echo "   SMTP: localhost:587"
echo "   Username: full email address"
echo "   Password: as set above"

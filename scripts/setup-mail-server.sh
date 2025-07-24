#!/bin/bash

# LabSyncPro Mail Server Setup Script
# This script sets up a local mail server using Docker

set -e

echo "🚀 Setting up LabSyncPro Mail Server..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create mail server directory
MAIL_DIR="$(pwd)/docker-mail"
echo "📁 Creating mail server directory: $MAIL_DIR"
mkdir -p "$MAIL_DIR"
cd "$MAIL_DIR"

# Create docker-compose.yml
echo "📝 Creating docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  mailserver:
    image: docker.io/mailserver/docker-mailserver:latest
    container_name: labsyncpro-mailserver
    hostname: mail.labsync.local
    ports:
      - "25:25"    # SMTP
      - "143:143"  # IMAP
      - "587:587"  # SMTP Submission
      - "993:993"  # IMAPS
    volumes:
      - ./docker-data/dms/mail-data/:/var/mail/
      - ./docker-data/dms/mail-state/:/var/mail-state/
      - ./docker-data/dms/mail-logs/:/var/log/mail/
      - ./docker-data/dms/config/:/tmp/docker-mailserver/
      - /etc/localtime:/etc/localtime:ro
    environment:
      - ENABLE_RSPAMD=1
      - ENABLE_CLAMAV=0  # Disabled for development
      - ENABLE_FAIL2BAN=1
      - ENABLE_POSTGREY=0  # Disabled for development
      - ENABLE_MANAGESIEVE=1
      - ONE_DIR=1
      - ENABLE_UPDATE_CHECK=1
      - UPDATE_CHECK_INTERVAL=1d
      - PERMIT_DOCKER=none
      - SSL_TYPE=self-signed
      - SPOOF_PROTECTION=1
      - ENABLE_SRS=1
      - LOG_LEVEL=info
    cap_add:
      - NET_ADMIN
      - SYS_PTRACE
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "ss", "-lntp", "|", "grep", ":25"]
      timeout: 3s
      retries: 0
    
  webmail:
    image: roundcube/roundcubemail:latest
    container_name: labsyncpro-webmail
    ports:
      - "8080:80"
    environment:
      - ROUNDCUBEMAIL_DB_TYPE=sqlite
      - ROUNDCUBEMAIL_SKIN=elastic
      - ROUNDCUBEMAIL_DEFAULT_HOST=mailserver
      - ROUNDCUBEMAIL_SMTP_SERVER=mailserver
      - ROUNDCUBEMAIL_SMTP_PORT=587
      - ROUNDCUBEMAIL_PLUGINS=archive,zipdownload,managesieve
    volumes:
      - ./docker-data/roundcube:/var/roundcube/db
    depends_on:
      - mailserver
    restart: unless-stopped

  # Optional: MailHog for development testing
  mailhog:
    image: mailhog/mailhog:latest
    container_name: labsyncpro-mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
    restart: unless-stopped

networks:
  default:
    name: labsyncpro-mail-network
EOF

# Create necessary directories
echo "📁 Creating data directories..."
mkdir -p docker-data/dms/{mail-data,mail-state,mail-logs,config}
mkdir -p docker-data/roundcube

# Create initial configuration
echo "⚙️ Creating initial configuration..."
mkdir -p docker-data/dms/config

# Create postfix-accounts.cf for initial accounts
cat > docker-data/dms/config/postfix-accounts.cf << 'EOF'
admin@labsync.local|{SHA512-CRYPT}$6$rounds=656000$YQKJjGGVz7$8rMZlrjTXqKolyDqGn.fxHtX4z8/rMZlrjTXqKolyDqGn.fxHtX4z8
EOF

# Create postfix-virtual.cf for aliases
cat > docker-data/dms/config/postfix-virtual.cf << 'EOF'
# Virtual aliases
noreply@labsync.local admin@labsync.local
system@labsync.local admin@labsync.local
EOF

# Set proper permissions
echo "🔒 Setting permissions..."
chmod -R 755 docker-data/

# Pull Docker images
echo "📥 Pulling Docker images..."
docker-compose pull

# Start the mail server
echo "🚀 Starting mail server..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check if services are running
echo "🔍 Checking service status..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ Mail server is running!"
    echo ""
    echo "📧 Mail Server Information:"
    echo "  - SMTP Server: localhost:587"
    echo "  - IMAP Server: localhost:993"
    echo "  - Webmail: http://localhost:8080"
    echo "  - MailHog (dev): http://localhost:8025"
    echo ""
    echo "👤 Default Admin Account:"
    echo "  - Email: admin@labsync.local"
    echo "  - Password: admin123"
    echo ""
    echo "🔧 To manage email accounts:"
    echo "  docker exec labsyncpro-mailserver setup email add user@labsync.local password123"
    echo "  docker exec labsyncpro-mailserver setup email del user@labsync.local"
    echo ""
    echo "📋 To view logs:"
    echo "  docker-compose logs -f mailserver"
    echo "  docker-compose logs -f webmail"
    echo ""
    echo "🛑 To stop the mail server:"
    echo "  docker-compose down"
else
    echo "❌ Failed to start mail server. Check logs:"
    docker-compose logs
    exit 1
fi

# Create helper scripts
echo "📝 Creating helper scripts..."

# Create add-email-account.sh
cat > add-email-account.sh << 'EOF'
#!/bin/bash
if [ $# -ne 2 ]; then
    echo "Usage: $0 <email> <password>"
    echo "Example: $0 john.doe@labsync.local password123"
    exit 1
fi

EMAIL=$1
PASSWORD=$2

echo "Adding email account: $EMAIL"
docker exec labsyncpro-mailserver setup email add "$EMAIL" "$PASSWORD"

if [ $? -eq 0 ]; then
    echo "✅ Email account created successfully!"
    echo "📧 Email: $EMAIL"
    echo "🔑 Password: $PASSWORD"
    echo "🌐 Webmail: http://localhost:8080"
else
    echo "❌ Failed to create email account"
    exit 1
fi
EOF

# Create remove-email-account.sh
cat > remove-email-account.sh << 'EOF'
#!/bin/bash
if [ $# -ne 1 ]; then
    echo "Usage: $0 <email>"
    echo "Example: $0 john.doe@labsync.local"
    exit 1
fi

EMAIL=$1

echo "Removing email account: $EMAIL"
docker exec labsyncpro-mailserver setup email del "$EMAIL"

if [ $? -eq 0 ]; then
    echo "✅ Email account removed successfully!"
else
    echo "❌ Failed to remove email account"
    exit 1
fi
EOF

# Create list-email-accounts.sh
cat > list-email-accounts.sh << 'EOF'
#!/bin/bash
echo "📧 Email Accounts:"
docker exec labsyncpro-mailserver setup email list
EOF

# Create backup-mail-data.sh
cat > backup-mail-data.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="./backups/mail-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 Creating mail data backup..."
cp -r docker-data/ "$BACKUP_DIR/"

echo "✅ Backup created: $BACKUP_DIR"
EOF

# Make scripts executable
chmod +x *.sh

echo ""
echo "🎉 Mail server setup completed!"
echo "📁 Mail server directory: $MAIL_DIR"
echo "🔧 Helper scripts created:"
echo "  - add-email-account.sh"
echo "  - remove-email-account.sh"
echo "  - list-email-accounts.sh"
echo "  - backup-mail-data.sh"
echo ""
echo "🚀 Next steps:"
echo "1. Access webmail at http://localhost:8080"
echo "2. Login with admin@labsync.local / admin123"
echo "3. Create email accounts for your users"
echo "4. Configure LabSyncPro to use the local mail server"

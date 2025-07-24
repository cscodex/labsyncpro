#!/bin/bash

# Simple Mail Server Setup for LabSyncPro (macOS)
echo "🚀 Setting up Simple Mail Server for LabSyncPro..."

# Install Postfix and Dovecot via Homebrew
echo "📦 Installing mail server components..."
brew install postfix dovecot

# Create mail directories
echo "📁 Creating mail directories..."
sudo mkdir -p /usr/local/var/mail
sudo mkdir -p /usr/local/etc/postfix
sudo mkdir -p /usr/local/etc/dovecot

# Create basic Postfix configuration
echo "⚙️ Configuring Postfix..."
sudo tee /usr/local/etc/postfix/main.cf > /dev/null <<EOF
# Basic Postfix configuration for LabSyncPro
myhostname = mail.labsync.local
mydomain = labsync.local
myorigin = \$mydomain
inet_interfaces = all
mydestination = \$myhostname, localhost.\$mydomain, localhost, \$mydomain
mynetworks = 127.0.0.0/8, 192.168.0.0/16, 10.0.0.0/8
home_mailbox = Maildir/
mailbox_command = 
smtpd_banner = \$myhostname ESMTP \$mail_name
biff = no
append_dot_mydomain = no
readme_directory = no

# SMTP Authentication
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth
smtpd_sasl_auth_enable = yes
smtpd_sasl_security_options = noanonymous
smtpd_sasl_local_domain = \$myhostname
broken_sasl_auth_clients = yes

# TLS parameters
smtpd_use_tls = yes
smtpd_tls_cert_file = /usr/local/etc/postfix/server.crt
smtpd_tls_key_file = /usr/local/etc/postfix/server.key
smtpd_tls_session_cache_database = btree:\${data_directory}/smtpd_scache
smtp_tls_session_cache_database = btree:\${data_directory}/smtp_scache

# Virtual mailbox settings
virtual_mailbox_domains = labsync.local
virtual_mailbox_base = /usr/local/var/mail
virtual_mailbox_maps = hash:/usr/local/etc/postfix/vmailbox
virtual_alias_maps = hash:/usr/local/etc/postfix/virtual
virtual_uid_maps = static:5000
virtual_gid_maps = static:5000
EOF

# Create basic Dovecot configuration
echo "⚙️ Configuring Dovecot..."
sudo tee /usr/local/etc/dovecot/dovecot.conf > /dev/null <<EOF
# Basic Dovecot configuration for LabSyncPro
protocols = imap pop3
listen = *

# Mail location
mail_location = maildir:/usr/local/var/mail/%d/%n/Maildir

# Authentication
auth_mechanisms = plain login
passdb {
  driver = passwd-file
  args = scheme=CRYPT username_format=%u /usr/local/etc/dovecot/users
}
userdb {
  driver = static
  args = uid=5000 gid=5000 home=/usr/local/var/mail/%d/%n
}

# SSL settings
ssl = no

# IMAP settings
service imap-login {
  inet_listener imap {
    port = 143
  }
}

# POP3 settings
service pop3-login {
  inet_listener pop3 {
    port = 110
  }
}

# SMTP Auth for Postfix
service auth {
  unix_listener /usr/local/var/spool/postfix/private/auth {
    mode = 0666
    user = postfix
    group = postfix
  }
}
EOF

# Create self-signed certificate
echo "🔐 Creating self-signed certificate..."
sudo openssl req -new -x509 -days 365 -nodes \
  -out /usr/local/etc/postfix/server.crt \
  -keyout /usr/local/etc/postfix/server.key \
  -subj "/C=US/ST=State/L=City/O=LabSyncPro/CN=mail.labsync.local"

# Create virtual mailbox and alias files
echo "📧 Setting up virtual mailboxes..."
sudo touch /usr/local/etc/postfix/vmailbox
sudo touch /usr/local/etc/postfix/virtual
sudo touch /usr/local/etc/dovecot/users

# Set permissions
echo "🔐 Setting permissions..."
sudo chown -R postfix:postfix /usr/local/etc/postfix
sudo chown -R dovecot:dovecot /usr/local/etc/dovecot
sudo chmod 600 /usr/local/etc/postfix/server.key
sudo chmod 644 /usr/local/etc/postfix/server.crt

echo "✅ Simple mail server setup complete!"
echo ""
echo "🔧 To add users, use the manage-simple-mail.sh script"
echo "📧 SMTP: localhost:25"
echo "📬 IMAP: localhost:143"
echo "📮 POP3: localhost:110"
EOF

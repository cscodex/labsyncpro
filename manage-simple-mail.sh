#!/bin/bash

# Simple Mail User Management for LabSyncPro

show_help() {
    echo "LabSyncPro Simple Mail User Management"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  add <email> <password>     - Add new email account"
    echo "  delete <email>             - Delete email account"
    echo "  list                       - List all email accounts"
    echo "  passwd <email> <password>  - Change password"
    echo "  start                      - Start mail services"
    echo "  stop                       - Stop mail services"
    echo "  status                     - Check service status"
    echo ""
    echo "Examples:"
    echo "  $0 add admin@labsync.local admin123"
    echo "  $0 delete admin@labsync.local"
    echo "  $0 passwd admin@labsync.local newpassword"
    echo "  $0 start"
}

add_user() {
    local email=$1
    local password=$2
    
    if [[ -z "$email" || -z "$password" ]]; then
        echo "❌ Error: Email and password required"
        echo "Usage: $0 add <email> <password>"
        exit 1
    fi
    
    echo "📧 Adding email account: $email"
    
    # Extract domain and username
    local domain=$(echo $email | cut -d'@' -f2)
    local username=$(echo $email | cut -d'@' -f1)
    
    # Create mailbox entry
    echo "$email $domain/$username/" | sudo tee -a /usr/local/etc/postfix/vmailbox > /dev/null
    
    # Create user entry with encrypted password
    local encrypted_password=$(openssl passwd -1 "$password")
    echo "$email:$encrypted_password" | sudo tee -a /usr/local/etc/dovecot/users > /dev/null
    
    # Create mail directory
    sudo mkdir -p "/usr/local/var/mail/$domain/$username/Maildir"
    sudo chown -R 5000:5000 "/usr/local/var/mail/$domain"
    
    # Update postfix maps
    sudo postmap /usr/local/etc/postfix/vmailbox
    sudo postmap /usr/local/etc/postfix/virtual
    
    echo "✅ Email account created successfully"
    echo "📬 Mailbox: /usr/local/var/mail/$domain/$username/Maildir"
}

delete_user() {
    local email=$1
    
    if [[ -z "$email" ]]; then
        echo "❌ Error: Email required"
        echo "Usage: $0 delete <email>"
        exit 1
    fi
    
    echo "🗑️  Deleting email account: $email"
    
    # Remove from vmailbox
    sudo sed -i '' "/^$email /d" /usr/local/etc/postfix/vmailbox
    
    # Remove from users
    sudo sed -i '' "/^$email:/d" /usr/local/etc/dovecot/users
    
    # Update postfix maps
    sudo postmap /usr/local/etc/postfix/vmailbox
    sudo postmap /usr/local/etc/postfix/virtual
    
    echo "✅ Email account deleted successfully"
}

list_users() {
    echo "📋 Email accounts:"
    if [[ -f /usr/local/etc/dovecot/users ]]; then
        sudo cat /usr/local/etc/dovecot/users | cut -d':' -f1
    else
        echo "No users found"
    fi
}

change_password() {
    local email=$1
    local password=$2
    
    if [[ -z "$email" || -z "$password" ]]; then
        echo "❌ Error: Email and password required"
        echo "Usage: $0 passwd <email> <password>"
        exit 1
    fi
    
    echo "🔐 Changing password for: $email"
    
    # Remove old entry
    sudo sed -i '' "/^$email:/d" /usr/local/etc/dovecot/users
    
    # Add new entry with encrypted password
    local encrypted_password=$(openssl passwd -1 "$password")
    echo "$email:$encrypted_password" | sudo tee -a /usr/local/etc/dovecot/users > /dev/null
    
    echo "✅ Password changed successfully"
}

start_services() {
    echo "🚀 Starting mail services..."
    
    # Start Postfix
    sudo brew services start postfix
    
    # Start Dovecot
    sudo brew services start dovecot
    
    echo "✅ Mail services started"
    echo "📧 SMTP: localhost:25"
    echo "📬 IMAP: localhost:143"
    echo "📮 POP3: localhost:110"
}

stop_services() {
    echo "🛑 Stopping mail services..."
    
    # Stop Postfix
    sudo brew services stop postfix
    
    # Stop Dovecot
    sudo brew services stop dovecot
    
    echo "✅ Mail services stopped"
}

check_status() {
    echo "📊 Mail service status:"
    echo ""
    echo "Postfix:"
    brew services list | grep postfix
    echo ""
    echo "Dovecot:"
    brew services list | grep dovecot
    echo ""
    echo "Listening ports:"
    lsof -i :25 -i :143 -i :110 2>/dev/null || echo "No mail services listening"
}

# Main script logic
case "$1" in
    add)
        add_user "$2" "$3"
        ;;
    delete)
        delete_user "$2"
        ;;
    list)
        list_users
        ;;
    passwd)
        change_password "$2" "$3"
        ;;
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    status)
        check_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac

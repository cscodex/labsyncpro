#!/bin/bash

# LabSyncPro Mail User Management Script

show_help() {
    echo "LabSyncPro Mail User Management"
    echo ""
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  add <email> <password>     - Add new email account"
    echo "  delete <email>             - Delete email account"
    echo "  list                       - List all email accounts"
    echo "  passwd <email> <password>  - Change password"
    echo "  alias <alias> <target>     - Create email alias"
    echo "  sync-users                 - Sync users from LabSyncPro database"
    echo ""
    echo "Examples:"
    echo "  $0 add john.doe@labsync.local password123"
    echo "  $0 delete john.doe@labsync.local"
    echo "  $0 passwd john.doe@labsync.local newpassword"
    echo "  $0 alias support@labsync.local admin@labsync.local"
    echo "  $0 sync-users"
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
    docker exec labsync-mailserver setup email add "$email" "$password"
    
    if [ $? -eq 0 ]; then
        echo "✅ Email account created successfully"
    else
        echo "❌ Failed to create email account"
    fi
}

delete_user() {
    local email=$1
    
    if [[ -z "$email" ]]; then
        echo "❌ Error: Email required"
        echo "Usage: $0 delete <email>"
        exit 1
    fi
    
    echo "🗑️  Deleting email account: $email"
    docker exec labsync-mailserver setup email del "$email"
    
    if [ $? -eq 0 ]; then
        echo "✅ Email account deleted successfully"
    else
        echo "❌ Failed to delete email account"
    fi
}

list_users() {
    echo "📋 Email accounts:"
    docker exec labsync-mailserver setup email list
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
    docker exec labsync-mailserver setup email update "$email" "$password"
    
    if [ $? -eq 0 ]; then
        echo "✅ Password changed successfully"
    else
        echo "❌ Failed to change password"
    fi
}

create_alias() {
    local alias=$1
    local target=$2
    
    if [[ -z "$alias" || -z "$target" ]]; then
        echo "❌ Error: Alias and target email required"
        echo "Usage: $0 alias <alias> <target>"
        exit 1
    fi
    
    echo "📮 Creating alias: $alias -> $target"
    docker exec labsync-mailserver setup alias add "$alias" "$target"
    
    if [ $? -eq 0 ]; then
        echo "✅ Alias created successfully"
    else
        echo "❌ Failed to create alias"
    fi
}

sync_users() {
    echo "🔄 Syncing users from LabSyncPro database..."
    
    # This would connect to your PostgreSQL database and create email accounts
    # for all users in the LabSyncPro system
    
    # Example using psql (you'll need to adjust connection details)
    PGPASSWORD=password psql -h localhost -U postgres -d labsyncpro -t -c "
        SELECT email, 'temp123' as password, role 
        FROM users 
        WHERE is_active = true
    " | while IFS='|' read -r email password role; do
        email=$(echo $email | xargs)  # trim whitespace
        password=$(echo $password | xargs)
        role=$(echo $role | xargs)
        
        if [[ -n "$email" ]]; then
            echo "Creating email for: $email ($role)"
            docker exec labsync-mailserver setup email add "$email" "$password" 2>/dev/null
        fi
    done
    
    echo "✅ User sync completed"
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
    alias)
        create_alias "$2" "$3"
        ;;
    sync-users)
        sync_users
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

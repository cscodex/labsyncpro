#!/bin/bash

# GitHub Setup Script for LabSyncPro
# Replace YOUR_USERNAME with your actual GitHub username

echo "🚀 Setting up GitHub repository for LabSyncPro..."

# Replace this with your GitHub username
GITHUB_USERNAME="YOUR_USERNAME"

if [ "$GITHUB_USERNAME" = "YOUR_USERNAME" ]; then
    echo "❌ Please edit this script and replace YOUR_USERNAME with your actual GitHub username"
    echo "   Edit github-setup.sh and change line 7"
    exit 1
fi

echo "📡 Adding GitHub remote..."
git remote add origin https://github.com/$GITHUB_USERNAME/LabSyncPro.git

echo "📤 Pushing to GitHub..."
git branch -M main
git push -u origin main

echo "✅ Repository pushed to GitHub!"
echo "🔗 Your repository: https://github.com/$GITHUB_USERNAME/LabSyncPro"
echo ""
echo "🎯 Next steps:"
echo "1. Go to render.com and sign up/login"
echo "2. Follow the deployment guide in DEPLOYMENT.md"
echo "3. Create Supabase database first"
echo "4. Then deploy to Render"

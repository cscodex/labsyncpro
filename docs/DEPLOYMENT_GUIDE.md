# LabSyncPro Deployment Guide

This guide provides step-by-step instructions for deploying LabSyncPro in various environments, from development to production.

## Table of Contents

1. [Development Environment](#development-environment)
2. [Production Deployment](#production-deployment)
3. [Docker Deployment](#docker-deployment)
4. [Cloud Deployment](#cloud-deployment)
5. [Database Setup](#database-setup)
6. [Environment Configuration](#environment-configuration)
7. [Security Considerations](#security-considerations)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)

## Development Environment

### Prerequisites

- **Node.js**: Version 16.0 or higher
- **PostgreSQL**: Version 12.0 or higher
- **npm**: Version 7.0 or higher (comes with Node.js)
- **Git**: For version control

### Quick Start

1. **Clone the Repository**
```bash
git clone https://github.com/your-org/labsyncpro.git
cd labsyncpro
```

2. **Install Dependencies**
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. **Database Setup**
```bash
# Create PostgreSQL database
createdb labsyncpro_dev

# Run migrations
npm run migrate

# Seed development data
npm run seed
```

4. **Environment Configuration**
```bash
# Copy environment templates
cp server/.env.example server/.env
cp client/.env.example client/.env

# Edit the .env files with your configuration
```

5. **Start Development Servers**
```bash
# From the root directory
npm run dev
```

This will start both the frontend (port 5173) and backend (port 5000) servers with hot reload.

## Production Deployment

### Server Requirements

- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB minimum, SSD recommended
- **OS**: Ubuntu 20.04 LTS or CentOS 8+
- **Network**: Static IP address, domain name

### Step 1: Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install Nginx (reverse proxy)
sudo apt install nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

### Step 2: Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE labsyncpro_prod;
CREATE USER labsyncpro WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE labsyncpro_prod TO labsyncpro;
\q
```

### Step 3: Application Deployment

```bash
# Create application directory
sudo mkdir -p /var/www/labsyncpro
sudo chown $USER:$USER /var/www/labsyncpro

# Clone and build application
cd /var/www/labsyncpro
git clone https://github.com/your-org/labsyncpro.git .

# Install dependencies
npm install
cd client && npm install && npm run build
cd ../server && npm install && npm run build
```

### Step 4: Environment Configuration

Create production environment files:

**server/.env**
```env
NODE_ENV=production
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=labsyncpro_prod
DB_USER=labsyncpro
DB_PASSWORD=secure_password
JWT_SECRET=your_very_secure_jwt_secret_key_here
CORS_ORIGIN=https://yourdomain.com
```

**client/.env**
```env
VITE_API_URL=https://yourdomain.com/api
```

### Step 5: Process Management

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'labsyncpro-server',
    script: './server/dist/index.js',
    cwd: '/var/www/labsyncpro',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 6: Nginx Configuration

```bash
# Create Nginx configuration
sudo cat > /etc/nginx/sites-available/labsyncpro << EOF
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Serve static files
    location / {
        root /var/www/labsyncpro/client/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # File uploads
    client_max_body_size 50M;
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/labsyncpro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 7: SSL Certificate

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Docker Deployment

### Dockerfile (Backend)

```dockerfile
# server/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

### Dockerfile (Frontend)

```dockerfile
# client/Dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  database:
    image: postgres:14
    environment:
      POSTGRES_DB: labsyncpro
      POSTGRES_USER: labsyncpro
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./server
    environment:
      NODE_ENV: production
      DB_HOST: database
      DB_NAME: labsyncpro
      DB_USER: labsyncpro
      DB_PASSWORD: password
      JWT_SECRET: your_jwt_secret
    depends_on:
      - database
    ports:
      - "5000:5000"

  frontend:
    build: ./client
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Deploy with Docker

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale backend
docker-compose up -d --scale backend=3
```

## Cloud Deployment

### AWS Deployment

#### Using AWS Elastic Beanstalk

1. **Install EB CLI**
```bash
pip install awsebcli
```

2. **Initialize Application**
```bash
eb init labsyncpro
eb create production
```

3. **Deploy**
```bash
eb deploy
```

#### Using AWS ECS

1. **Create ECR Repository**
2. **Build and Push Images**
3. **Create ECS Cluster**
4. **Deploy Services**

### Google Cloud Platform

#### Using Google App Engine

```yaml
# app.yaml
runtime: nodejs18

env_variables:
  NODE_ENV: production
  DB_HOST: /cloudsql/project:region:instance
  JWT_SECRET: your_jwt_secret

automatic_scaling:
  min_instances: 1
  max_instances: 10
```

### Heroku Deployment

```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create labsyncpro-prod

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_jwt_secret

# Deploy
git push heroku main
```

## Database Setup

### Production Database Configuration

```sql
-- Create optimized indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_schedules_date ON schedules(start_time, end_time);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_grades_submission ON grades(submission_id);

-- Set up database maintenance
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

### Backup Strategy

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U labsyncpro labsyncpro_prod > backup_$DATE.sql
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
rm backup_$DATE.sql
```

## Environment Configuration

### Production Environment Variables

```env
# Security
NODE_ENV=production
JWT_SECRET=very_long_random_string_here
SESSION_SECRET=another_long_random_string

# Database
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=labsyncpro_prod
DB_USER=labsyncpro
DB_PASSWORD=secure_password
DB_SSL=true

# File Storage
UPLOAD_PATH=/var/uploads
MAX_FILE_SIZE=10485760

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=your_sentry_dsn
```

## Security Considerations

### Application Security

1. **Environment Variables**: Never commit secrets to version control
2. **HTTPS**: Always use SSL/TLS in production
3. **CORS**: Configure proper CORS origins
4. **Rate Limiting**: Implement API rate limiting
5. **Input Validation**: Validate all user inputs
6. **File Uploads**: Scan uploaded files for malware

### Server Security

```bash
# Firewall configuration
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443

# Fail2ban for SSH protection
sudo apt install fail2ban

# Regular security updates
sudo apt update && sudo apt upgrade -y
```

### Database Security

```sql
-- Revoke public access
REVOKE ALL ON SCHEMA public FROM PUBLIC;

-- Create read-only user for reporting
CREATE USER labsyncpro_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE labsyncpro_prod TO labsyncpro_readonly;
GRANT USAGE ON SCHEMA public TO labsyncpro_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO labsyncpro_readonly;
```

## Monitoring and Maintenance

### Health Checks

```javascript
// server/routes/health.js
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});
```

### Logging

```bash
# Centralized logging with rsyslog
sudo apt install rsyslog

# Log rotation
sudo cat > /etc/logrotate.d/labsyncpro << EOF
/var/www/labsyncpro/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload labsyncpro-server
    endscript
}
EOF
```

### Performance Monitoring

```bash
# Install monitoring tools
npm install -g clinic
npm install newrelic

# Monitor with PM2
pm2 install pm2-server-monit
```

### Backup and Recovery

```bash
# Automated backup script
#!/bin/bash
# /usr/local/bin/backup-labsyncpro.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/labsyncpro"

# Database backup
pg_dump -h localhost -U labsyncpro labsyncpro_prod | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Application backup
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /var/www/labsyncpro --exclude=node_modules

# Upload to cloud storage
aws s3 sync $BACKUP_DIR s3://your-backup-bucket/labsyncpro/

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

### Maintenance Tasks

```bash
# Weekly maintenance script
#!/bin/bash

# Update system packages
sudo apt update && sudo apt upgrade -y

# Restart services
pm2 restart all
sudo systemctl restart nginx

# Database maintenance
psql -h localhost -U labsyncpro labsyncpro_prod -c "VACUUM ANALYZE;"

# Clear old logs
find /var/www/labsyncpro/logs -name "*.log" -mtime +7 -delete

# Check disk space
df -h
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check PostgreSQL service status
   - Verify connection credentials
   - Check firewall rules

2. **File Upload Issues**
   - Check disk space
   - Verify upload directory permissions
   - Check Nginx client_max_body_size

3. **Performance Issues**
   - Monitor CPU and memory usage
   - Check database query performance
   - Review application logs

4. **SSL Certificate Issues**
   - Verify certificate expiration
   - Check Nginx configuration
   - Renew certificates if needed

### Support

For deployment support:
- Check the troubleshooting section
- Review application logs
- Contact the development team
- Submit issues on GitHub

---

This deployment guide covers the most common deployment scenarios. For specific requirements or custom deployments, please consult with the development team.

# 🚀 Project Management System

<div align="center"> 
<br> 
<br>
<img src="./src/assets/icons/ic-logo.svg" height="140" />
<h3> Project Management </h3>
  <p>
    <p style="font-size: 14px">
      A modern admin dashboard built with React 19, Vite, shadcn/ui, and TypeScript. Features user management, project tracking, interview scheduling, and call management with role-based access control.
    </p>
    <br />
    <br />
    <br />
    <br />
</div>

## ✨ Features

- **🎯 Modern Tech Stack**: React 19, Vite, TypeScript, Tailwind CSS
- **🎨 Beautiful UI**: shadcn/ui components with Framer Motion animations
- **👥 User Management**: Role-based access (Admin, User, Caller)
- **📊 Dashboard**: Real-time analytics and project tracking
- **📋 Project Management**: Create, assign, and track projects and tasks
- **💼 Job Applications**: Track applications and schedule interviews
- **📞 Call Management**: Schedule and track calls for callers
- **📄 Resume Management**: Upload, edit, and manage resumes with saved resume tracking
- **📈 Activity Tracking**: Comprehensive audit trail for all user actions
- **🔒 Security**: JWT authentication, password hashing, RLS
- **🗄️ Database**: Supabase PostgreSQL with real-time features
- **🚀 Deployment**: Ready for Vercel and VPS deployment

## 🚀 Quick Start

### Prerequisites

- **Node.js** (version 20.x or higher)
- **pnpm** package manager
- **Supabase account** (free forever)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd project-management
pnpm install
```

### 2. Database Setup (Supabase - FREE)

#### 2.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (free, no credit card required)
4. Create new project:
   - **Name**: `project-management`
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your users
   - **Pricing Plan**: **Free** (selected by default)

#### 2.2 Import Database Schema
1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Copy the entire contents of `supabase_schema.sql`
4. Paste and run it in the SQL Editor
5. This creates all tables, indexes, triggers, and sample data

#### 2.3 Get Connection Details
1. Go to **Settings** → **API**
2. Copy your **Project URL** and **anon public** key

### 3. Environment Configuration

#### 3.1 Frontend Environment
Create `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# JWT Secret (IMPORTANT: Change this to a secure random string in production)
VITE_JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Application URLs
VITE_RESET_PASSWORD_URL=http://localhost:5173/reset-password
```

#### 3.2 Backend Environment
Create `backend/.env` file:

```env
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
PORT=4000
```

### 4. Start the Application

#### 4.1 Start Backend Server
```bash
cd backend
npm install
npm start
```
Backend runs on: `http://localhost:4000`

#### 4.2 Start Frontend (New Terminal)
```bash
pnpm dev
```
Frontend runs on: `http://localhost:5173`

### 5. Default Login Credentials

| Role | Username | Email | Password |
|------|----------|-------|----------|
| **Admin** | admin | admin@projectmanagement.com | admin123 |
| **Caller** | caller | caller@projectmanagement.com | admin123 |
| **User** | testuser | testuser@example.com | admin123 |

⚠️ **IMPORTANT**: Change these passwords immediately after first login!

## 🗄️ Database Schema

The `supabase_schema.sql` file includes:

### Core Tables
- **`users`** - User accounts with roles (0=admin, 1=user, 2=caller)
- **`projects`** - Project management
- **`tasks`** - Task management
- **`job_applications`** - Job applications with resume tracking
- **`interviews`** - Interview scheduling (supports both linked and standalone)
- **`saved_resumes`** - Resume management
- **`proposals`** - Proposal management

### Advanced Features
- **`schedule_permissions`** - Caller access control system
- **`call_schedules`** - Call management for callers
- **`call_notifications`** - Notification system
- **`caller_performance`** - Performance tracking
- **`activity_logs`** - Audit trail
- **`sessions`** - JWT session management

### Security & Performance
- **Indexes** - Optimized for all common queries
- **Triggers** - Automatic timestamp updates
- **RLS Policies** - Row Level Security enabled
- **Constraints** - Data integrity checks

## 🚀 Deployment (Vercel)

### 1. Deploy to Vercel
```bash
# Install Vercel CLI (optional)
npm install -g vercel

# Deploy
vercel --prod
```

### 2. Environment Variables in Vercel
Add these in your Vercel dashboard (Settings → Environment Variables):

```env
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
JWT_SECRET=your-secure-jwt-secret
NODE_ENV=production
```

### 3. Test Deployment
- Visit your Vercel URL
- Test database connection: `https://your-app.vercel.app/api/test-supabase`
- Login with default credentials

## 🖥️ VPS Deployment (Production)

### Prerequisites for VPS
- **VPS/Server** with Ubuntu 20.04+ or CentOS 8+
- **Domain name** (optional but recommended)
- **SSH access** to your VPS
- **Root or sudo access**

### 1. Server Setup

#### Install Node.js and PM2
```bash
# SSH into your VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 globally
npm install -g pm2

# Install pnpm
npm install -g pnpm

# Install Git
apt install git -y
```

#### Install Nginx (Optional but Recommended)
```bash
# Install Nginx
apt install nginx -y

# Start and enable Nginx
systemctl start nginx
systemctl enable nginx

# Configure firewall
ufw allow 'Nginx Full'
ufw allow ssh
ufw enable
```

### 2. Deploy Application

#### Clone and Setup
```bash
# Create application directory
mkdir -p /var/www/project-management
cd /var/www/project-management

# Clone your repository
git clone https://github.com/your-username/your-repo.git .

# Install dependencies
pnpm install
cd backend && npm install && cd ..

# Create uploads directory
mkdir -p backend/uploads/resumes
chmod 755 backend/uploads/resumes
```

#### Environment Configuration
```bash
# Create production environment file
nano backend/.env
```

Add your production environment variables:
```env
# Supabase Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# JWT Configuration
JWT_SECRET=your-very-secure-jwt-secret-key-here

# Server Configuration
PORT=4000
NODE_ENV=production

# CORS Configuration
CORS_ORIGIN=https://your-domain.com
```

### 3. Build and Start Application

#### Build Frontend
```bash
# Build the frontend
pnpm build

# The built files will be in the 'dist' directory
```

#### Start Backend with PM2
```bash
# Start backend with PM2
cd backend
pm2 start server.js --name "project-management-api"

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 4. Configure Nginx (Optional)

#### Create Nginx Configuration
```bash
# Create Nginx site configuration
nano /etc/nginx/sites-available/project-management
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Serve static files (frontend build)
    location / {
        root /var/www/project-management/dist;
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    }
    
    # Serve uploaded files
    location /uploads/ {
        alias /var/www/project-management/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # Security for file uploads
        location ~* \.(php|jsp|asp|sh|cgi)$ {
            deny all;
        }
    }
    
    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
}
```

#### Enable Site and Restart Nginx
```bash
# Enable the site
ln -s /etc/nginx/sites-available/project-management /etc/nginx/sites-enabled/

# Remove default site (optional)
rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Restart Nginx
systemctl restart nginx
```

### 5. SSL Certificate (Recommended)

#### Install Certbot
```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Test automatic renewal
certbot renew --dry-run
```

### 6. File Permissions and Security

#### Set Proper Permissions
```bash
# Set ownership
chown -R www-data:www-data /var/www/project-management

# Set permissions
chmod -R 755 /var/www/project-management
chmod -R 644 /var/www/project-management/backend/uploads/resumes

# Secure environment file
chmod 600 /var/www/project-management/backend/.env
```

### 7. Monitoring and Maintenance

#### PM2 Monitoring
```bash
# View PM2 status
pm2 status

# View logs
pm2 logs project-management-api

# Restart application
pm2 restart project-management-api

# Monitor resources
pm2 monit
```

#### System Monitoring
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check running processes
htop

# Check Nginx status
systemctl status nginx
```

### 8. Backup Strategy

#### Create Backup Script
```bash
# Create backup directory
mkdir -p /var/backups/project-management

# Create backup script
nano /var/backups/backup.sh
```

Add backup script:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/project-management"
APP_DIR="/var/www/project-management"

# Create backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C $APP_DIR .

# Keep only last 7 days of backups
find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: app_backup_$DATE.tar.gz"
```

#### Setup Cron Job for Backups
```bash
# Make script executable
chmod +x /var/backups/backup.sh

# Add to crontab (daily backup at 2 AM)
crontab -e
# Add this line:
0 2 * * * /var/backups/backup.sh
```

### 9. Troubleshooting

#### Common Issues
```bash
# Check if backend is running
pm2 status

# Check backend logs
pm2 logs project-management-api --lines 50

# Check Nginx logs
tail -f /var/log/nginx/error.log

# Check system resources
htop

# Restart services
pm2 restart project-management-api
systemctl restart nginx
```

#### Health Check URLs
- **Application**: `http://your-domain.com`
- **API Health**: `http://your-domain.com/api/health`
- **Database Test**: `http://your-domain.com/api/test-supabase`

### 10. Production Checklist

- ✅ **Server Setup**: Node.js, PM2, Nginx installed
- ✅ **Application Deployed**: Code cloned and dependencies installed
- ✅ **Environment Variables**: Production .env configured
- ✅ **Database**: Supabase connected and schema applied
- ✅ **File Uploads**: Upload directory created with proper permissions
- ✅ **SSL Certificate**: HTTPS enabled (optional but recommended)
- ✅ **Firewall**: Only necessary ports open
- ✅ **Backup Strategy**: Automated backups configured
- ✅ **Monitoring**: PM2 and system monitoring in place
- ✅ **Security**: Proper file permissions and security headers

## 🎯 Available Scripts

```bash
# Frontend
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm preview      # Preview production build

# Backend
cd backend && npm start    # Start backend server
cd backend && npm run dev  # Start with auto-restart

# Database
# Run supabase_schema.sql in Supabase SQL Editor
```

## 🏗️ Project Structure

```
project-management/
├── 📁 src/                        # React frontend source
│   ├── 📁 components/             # Reusable UI components
│   ├── 📁 pages/                  # Page components
│   ├── 📁 hooks/                  # Custom React hooks
│   ├── 📁 api/                    # API client functions
│   ├── 📁 utils/                  # Utility functions
│   └── 📁 types/                  # TypeScript definitions
├── 📁 backend/                    # Node.js backend
│   ├── 📄 server.js               # Main server file
│   ├── 📄 db.js                   # Database connection
│   └── 📄 package.json            # Backend dependencies
├── 📁 api/                        # Vercel serverless functions
├── 🗄️ supabase_schema.sql         # Complete database schema
├── ⚙️ package.json                # Frontend dependencies
├── 🎨 tailwind.config.ts          # Tailwind CSS config
├── ⚙️ vite.config.ts              # Vite build config
└── 📖 README.md                   # This file
```

## 🔧 Technology Stack

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Framer Motion** - Animations
- **Zustand** - State management
- **React Query** - Data fetching

### Backend
- **Node.js** with **Express.js**
- **Supabase** - PostgreSQL database
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Database
- **Supabase PostgreSQL** - Database
- **Row Level Security** - Data protection
- **Real-time subscriptions** - Live updates

## 🆓 Free Tier Limits (Supabase)

- **Database size**: 500MB
- **Bandwidth**: 2GB/month
- **API requests**: 50,000/month
- **Authentication users**: 50,000 MAU
- **Realtime connections**: 200 concurrent

**Perfect for your project management system!**

## 🔒 Security Features

- ✅ JWT-based authentication with refresh tokens
- ✅ Password hashing using bcryptjs (12 rounds)
- ✅ SQL injection protection via prepared statements
- ✅ Session management with automatic cleanup
- ✅ Row Level Security (RLS) policies
- ✅ Secure password reset functionality

## 🚨 Troubleshooting

### Backend Issues
- Make sure you have a `backend/.env` file with Supabase credentials
- Check that your Supabase project is accessible
- Verify the backend starts successfully before starting the frontend

### Frontend Issues
- Make sure the backend is running first (frontend needs API calls)
- Clear node_modules and reinstall if needed: `rm -rf node_modules && pnpm install`
- Check that ports 5173 (frontend) and 4000 (backend) are available

### Database Issues
- Verify your Supabase project is active
- Check that the schema was imported successfully
- Test connection: Visit `/api/test-supabase` endpoint

### Deployment Issues
- Check Vercel build logs in dashboard
- Verify all environment variables are set correctly
- Ensure PostgreSQL dependency is installed

## 📚 Additional Resources

- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **React Documentation**: [react.dev](https://react.dev)
- **Tailwind CSS**: [tailwindcss.com](https://tailwindcss.com)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎉 Ready to Go!

Your Project Management System is now ready with:
- **FREE Supabase PostgreSQL database**
- **FREE Vercel hosting**
- **Complete user management**
- **Real-time project tracking**
- **Professional dashboard**

**Total Cost: $0.00/month** 🎉

---

<div align="center">
  <p>Built with ❤️ using React, TypeScript, and Supabase</p>
</div>
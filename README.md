# Marketing Agent Application - Complete Setup

This is a comprehensive marketing automation platform that enables automated email campaigns with interview management, custom templates, and detailed analytics.

## 🚀 Application Overview

The application consists of 6 main pages:

1. **Dashboard** - Analytics and system status overview
2. **Emails** - Email list management with CSV upload and pagination
3. **Interviews** - Interview management and campaign tracking
4. **Templates** - Custom email template creation and management
5. **Settings** - SMTP configuration and email scheduling
6. **Knowledge Base** - Complete documentation and setup guides

## 📋 Features

### Email Management
- ✅ CSV upload with drag-and-drop interface
- ✅ Pagination (10 emails per page)
- ✅ Email status tracking (pending, sent, delivered, opened, exhausted)
- ✅ Real-time email statistics

### Interview System
- ✅ Bulk interview creation
- ✅ Individual interview management
- ✅ Interview status tracking
- ✅ Automated email follow-ups
- ✅ Progress monitoring with completion rates

### Email Templates
- ✅ Custom email templates for specific contacts
- ✅ Template placeholders: `{interview_link}`, `{follow_up_num}`, `{email}`
- ✅ Default template fallback
- ✅ Template management interface

### Dashboard Analytics
- ✅ Real-time email statistics
- ✅ Interview completion tracking
- ✅ SMTP and scheduler status monitoring
- ✅ Visual charts (Area, Bar, Line, Pie)
- ✅ Setup status warnings

### Configuration
- ✅ SMTP server configuration
- ✅ Email scheduling settings (interval, max limit, timing)
- ✅ Real-time configuration validation

## 🛠️ Setup Instructions

### 1. Prerequisites
- Node.js 18+ installed
- Python 3.8+ installed
- MongoDB database running
- SMTP email server credentials

### 2. Backend Setup
```bash
cd backend
pip install fastapi uvicorn pymongo python-multipart
```

Start the FastAPI server:
```bash
uvicorn app:app --reload --port 8000
```

Start the email scheduler:
```bash
python main.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The application will be available at: http://localhost:3000

### 4. Environment Configuration

Create `.env` file in frontend directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 5. Application Configuration

1. **SMTP Configuration** (Settings tab)
   - Configure your email server credentials
   - Example for Gmail: smtp.gmail.com, port 587

2. **Email Scheduling** (Settings tab)
   - Set max follow-ups per email (e.g., 3)
   - Set interval between emails in minutes (e.g., 60)
   - Set preferred sending time (e.g., 09:00)

3. **Email List Upload** (Emails tab)
   - Upload CSV file with 'email' column header
   - System supports bulk uploads and deduplication

4. **Custom Templates** (Templates tab - Optional)
   - Create personalized email templates
   - Use placeholders for dynamic content

5. **Start Interviews** (Interviews tab)
   - Start interviews individually or in bulk
   - Monitor progress and completion rates

## 📊 System Architecture

### Frontend (Next.js 15)
- **Framework**: Next.js 15 with App Router
- **UI Components**: Shadcn/ui with Tailwind CSS
- **Charts**: Recharts for data visualization
- **Authentication**: Lyzr Agent SDK integration
- **File Upload**: Advanced drag-and-drop component
- **Forms**: React Hook Form for validation

### Backend (FastAPI + MongoDB)
- **API**: FastAPI with CORS support
- **Database**: MongoDB with multiple collections
- **Email Scheduler**: Python cron job (runs every 5 minutes)
- **Email Templates**: Dynamic content with placeholders
- **Interview System**: Token-based tracking

### Data Flow
1. User uploads email list via CSV
2. SMTP and scheduler configuration completed
3. Interviews started (creates unique tokens)
4. Email scheduler automatically sends follow-ups
5. Real-time tracking of email status and interview completion

## 🔄 Email Automation Flow

```mermaid
graph TB
    A[Upload Email List] --> B[Configure SMTP]
    B --> C[Set Email Schedule]
    C --> D[Create Custom Templates (Optional)]
    D --> E[Start Interviews]
    E --> F[Email Scheduler Runs Every 5 Minutes]
    F --> G[Check Pending Interviews]
    G --> H[Send Automated Emails]
    H --> I[Update Email Status]
    I --> J[Track Interview Completion]
```

## 📡 API Endpoints

### Core Endpoints
- `POST /accounts` - Create user account
- `GET /emails/{user_id}` - Get email list
- `POST /emails/upload-csv` - Upload email CSV
- `POST /smtp` - Configure SMTP settings
- `POST /scheduler` - Configure email scheduling

### Interview Management
- `POST /interview/start` - Start interview process
- `GET /interview/status/{user_id}/{email}` - Check interview status
- `POST /interview/complete/{token}` - Complete interview

### Email Templates
- `POST /email-content` - Create/update email template
- `GET /email-content/{user_id}` - List user templates
- `GET /email-content/{user_id}/{email}` - Get specific template

## 🎯 Key Features Completed

✅ **6-Page Application**: Dashboard, Emails, Interviews, Templates, Settings, Knowledge Base
✅ **Email Pagination**: 10 items per page with navigation
✅ **CSV Upload**: Advanced file upload with progress tracking
✅ **Real-time Analytics**: Dashboard with live data and charts
✅ **Interview Management**: Bulk and individual interview operations
✅ **Custom Email Templates**: Template creation with placeholders
✅ **SMTP Configuration**: Full email server setup
✅ **Email Scheduling**: Automated follow-up configuration
✅ **Comprehensive Documentation**: Complete setup and usage guides

## 🔧 Development Notes

- All API calls include proper error handling and user feedback
- Components are fully typed with TypeScript
- Real-time data updates across all pages
- Responsive design for all screen sizes
- Professional UI with consistent styling
- Integration with backend email scheduler
- Authentication system with Lyzr SDK

## 📚 Additional Resources

- Complete setup guide available in the Knowledge Base tab
- API documentation included in application
- Troubleshooting guides for common issues
- Best practices for email marketing automation

This application is production-ready and can handle enterprise-scale email marketing campaigns!

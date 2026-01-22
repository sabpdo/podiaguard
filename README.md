# Podiaguard

**A comprehensive foot ulcer management platform for patients and clinicians**

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=for-the-badge&logo=supabase)](https://supabase.com)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Project Structure](#project-structure)
- [Development](#development)
- [Deployment](#deployment)
- [Key Features Explained](#key-features-explained)
- [Troubleshooting](#troubleshooting)

---

## Overview

Podiaguard is a medical device management platform designed to help patients track and manage their foot ulcer healing progress. The platform provides AI-powered wound analysis, photo documentation, educational resources, and a clinician dashboard for comprehensive patient care management.

### Key Capabilities

- **AI-Powered Image Capture**: Real-time object detection ensures proper camera positioning for accurate wound photography
- **Progress Tracking**: Visual timeline of wound healing with detailed analytics
- **Dressing Log**: Track daily dressing changes with streak monitoring
- **Educational Resources**: Comprehensive wound care guides and best practices
- **Bilingual Support**: Full English/Arabic support with RTL layout
- **Clinician Dashboard**: Healthcare providers can monitor multiple patients

---

## Features

### Patient Features

- **Smart Photo Capture**: AI-guided camera positioning using TensorFlow.js
- **Wound Analysis**: Automated size, depth, and tissue composition analysis
- **Dressing Log**: Track daily changes with visual progress charts
- **Education Hub**: Interactive guides on wound care and assessment
- **Photo Gallery**: Complete history with notes and timestamps
- **Notifications**: Reminders and alerts for care activities
- **Multi-language**: English and Arabic with RTL support

### Clinician Features

- **Patient Management**: View and manage multiple patients
- **Progress Monitoring**: Track patient healing trends
- **Alert System**: Monitor patient alerts and critical updates
- **Patient Profiles**: Comprehensive patient information and history

---

## Tech Stack

### Frontend

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI, Shadcn UI
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend & Services

- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (for images)
- **Hosting**: Vercel

### AI & Machine Learning

- **Object Detection**: TensorFlow.js with COCO-SSD model
- **Image Processing**: Custom edge detection algorithms
- **Model**: MobileNet V2 (optimized for mobile devices)

### Internationalization

- **i18n**: Custom React Context implementation
- **Languages**: English (en), Arabic (ar)
- **RTL Support**: Full right-to-left layout for Arabic

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18 or higher
- **pnpm**: Package manager (or npm/yarn)
- **Supabase Account**: For database and authentication
- **Modern Browser**: Chrome, Firefox, Safari, or Edge (for camera access)

---

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd podiguard
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory with your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Production URL (for email redirects and OAuth)
NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
```

**Where to find these values:**
- Go to your [Supabase Dashboard](https://app.supabase.com)
- Select your project
- Navigate to **Settings** → **API**
- Copy the `Project URL` and `anon public` key

**Important for Production:**
- Set `NEXT_PUBLIC_SITE_URL` to your production domain (e.g., `https://your-app.vercel.app`)
- Also configure the **Site URL** in your Supabase Dashboard → Authentication → URL Configuration
- Add your production domain to **Redirect URLs** in Supabase Authentication settings

### 4. Set Up Database

Run the SQL migration scripts in your Supabase SQL Editor:

1. **First migration** (`scripts/001_setup_ulcer_management.sql`):
   - Creates `profiles`, `ulcer_images`, and `notifications` tables
   - Sets up Row Level Security (RLS) policies

2. **Second migration** (`scripts/002_add_dressing_logs_and_analysis.sql`):
   - Adds `dressing_logs` table
   - Extends `ulcer_images` with analysis fields

**To run migrations:**
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of each SQL file
3. Click "Run" to execute

### 5. Configure Supabase Storage

Create a storage bucket for wound images:

1. Go to **Storage** in Supabase Dashboard
2. Click **New Bucket**
3. Name: `ulcer-images`
4. Set as **Private** (not public)
5. Enable RLS policies

### 6. Configure Authentication

In Supabase Dashboard → **Authentication** → **URL Configuration**:

- **Site URL**: Your production domain (e.g., `https://your-app.vercel.app`)
- **Redirect URLs**: Add your production domain and `http://localhost:3000` for development

**Note**: Email confirmation is currently disabled. Users are automatically signed in after registration.

### 7. Run Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

---

## Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `NEXT_PUBLIC_SITE_URL` | Production domain for redirects | Yes (Production) | `https://podiaguard.vercel.app` |

---

## Project Structure

```
podiguard/
├── app/                          # Next.js App Router pages
│   ├── auth/
│   │   └── callback/            # Supabase auth callback handler
│   ├── clinician/               # Clinician dashboard pages
│   │   ├── alerts/
│   │   ├── patients/
│   │   ├── register/
│   │   └── settings/
│   ├── dashboard/               # Patient dashboard pages
│   │   ├── capture/            # AI-powered photo capture
│   │   ├── gallery/            # Photo history
│   │   ├── dressing-log/       # Dressing change tracker
│   │   ├── education/          # Educational resources
│   │   ├── notifications/      # User notifications
│   │   ├── wound-details/      # Progress visualization
│   │   └── analysis/           # Wound analysis results
│   ├── login/                  # Authentication page
│   └── privacy-agreement/      # Privacy consent page
├── components/                  # Reusable React components
│   ├── ui/                     # Shadcn UI components
│   ├── language-switcher.tsx   # Language toggle component
│   └── bottom-nav.tsx          # Navigation component
├── lib/
│   ├── i18n/                   # Internationalization
│   │   ├── context.tsx         # Language context provider
│   │   └── translations.ts      # Translation strings
│   └── supabase/               # Supabase client utilities
│       ├── client.ts           # Browser client
│       └── server.ts           # Server client
├── scripts/                     # Database migration scripts
│   ├── 001_setup_ulcer_management.sql
│   └── 002_add_dressing_logs_and_analysis.sql
└── public/                      # Static assets
```

---

## Development

### Available Scripts

```bash
# Start development server (webpack)
pnpm dev

# Start development server (turbopack - faster)
pnpm dev:turbo

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint
```

### Development Notes

- **TensorFlow.js**: The app uses TensorFlow.js for object detection. Models are loaded client-side only (excluded from SSR).
- **Camera Access**: The app requires camera permissions. Test in a browser that supports `getUserMedia`.
- **Image Processing**: Large images may take time to process. Consider optimizing image sizes in production.

---

## Deployment

### Deploy to Vercel

1. **Push to GitHub**:
   ```bash
   git push origin main
   ```

2. **Import to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

3. **Configure Environment Variables**:
   - Add all environment variables from `.env.local`
   - Set `NEXT_PUBLIC_SITE_URL` to your Vercel domain

4. **Deploy**:
   - Vercel will automatically build and deploy
   - Your app will be available at `https://your-project.vercel.app`

**Note**: When you push to git, it automatically deploys to Vercel (if connected).

### Post-Deployment Checklist

- [ ] Verify Supabase RLS policies are active
- [ ] Test authentication flow (signup/login)
- [ ] Verify camera access works on mobile devices
- [ ] Test image upload to Supabase Storage
- [ ] Verify email redirects (if using email confirmation)
- [ ] Check Arabic RTL layout rendering
- [ ] Test clinician dashboard access

---

## Key Features Explained

### AI-Powered Image Capture

The capture page uses a hybrid detection approach:

1. **COCO-SSD Model**: Pre-trained TensorFlow.js model detects objects including "cell phone"
2. **Custom Image Processing**: Fallback algorithm using edge detection and contour analysis
3. **Distance Analysis**: Calculates optimal camera distance based on object size in frame
4. **Lighting Analysis**: Analyzes image brightness to ensure proper lighting conditions

**Algorithm Flow**:
```
Video Frame → COCO-SSD Detection → Cell Phone Validation → 
Distance Check → Lighting Check → Position Guidance → Capture Ready
```

### Internationalization (i18n)

- **Context-based**: Uses React Context API for global language state
- **Local Storage**: Persists language preference in browser
- **RTL Support**: Automatically switches text direction for Arabic
- **Font Scaling**: Larger font sizes for Arabic text (1.1em base)

### Database Schema

**Key Tables**:
- `profiles`: User profile information and privacy consent
- `ulcer_images`: Wound photos with analysis data
- `dressing_logs`: Daily dressing change records
- `notifications`: User alerts and reminders

**Security**: All tables use Row Level Security (RLS) to ensure users can only access their own data.

---

## Troubleshooting

### Camera Not Working

- **Check browser permissions**: Ensure camera access is granted
- **HTTPS required**: Camera API requires secure context (HTTPS or localhost)
- **Browser compatibility**: Use Chrome, Firefox, Safari, or Edge

### Images Not Uploading

- **Storage bucket**: Verify `ulcer-images` bucket exists in Supabase
- **RLS policies**: Check that storage policies allow authenticated uploads
- **File size**: Large images may fail. Consider compression

### Authentication Issues

- **Invalid Refresh Token**: Clear browser cookies and try again
- **Redirect errors**: Verify `NEXT_PUBLIC_SITE_URL` matches your domain
- **Supabase config**: Check that redirect URLs are configured correctly

### TensorFlow.js Model Not Loading

- **Network issues**: Models are downloaded from CDN. Check internet connection
- **Browser compatibility**: Ensure WebGL or WebAssembly is supported
- **Console errors**: Check browser console for specific error messages

### Arabic Text Not Displaying

- **Font loading**: Ensure fonts support Arabic characters
- **RTL layout**: Check that `dir="rtl"` is set on HTML element
- **Translation keys**: Verify translations exist in `lib/i18n/translations.ts`

---

## License

This project is private and proprietary.

---

## Contributing

This is a private project. For questions or issues, please contact the development team.

---

## Support

For technical support or questions:
- Check the [Supabase Documentation](https://supabase.com/docs)
- Review [Next.js Documentation](https://nextjs.org/docs)
- Check browser console for error messages

---

**Built for better patient care**

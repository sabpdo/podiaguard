# Podiguard

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/sabrina-dos-projects/v0-foot-ulcer)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/RZ7JYb16AaA)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/sabrina-dos-projects/v0-foot-ulcer](https://vercel.com/sabrina-dos-projects/podiguard)**


## Local Development

### Prerequisites

- Node.js (v18 or higher)
- pnpm (package manager)

### Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   
   Create a `.env.local` file in the root directory with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_SITE_URL=https://your-production-domain.com
   ```
   
   **Important for Production:**
   - Set `NEXT_PUBLIC_SITE_URL` to your production domain (e.g., `https://your-app.vercel.app`)
   - Also configure the **Site URL** in your Supabase Dashboard → Authentication → URL Configuration
   - Add your production domain to **Redirect URLs** in Supabase Authentication settings

3. **Run the development server:**
   ```bash
   pnpm dev
   ```
   
   The app will be available at `http://localhost:3000`

### Production Build

To build and run a production version locally:

```bash
# Build the app
pnpm build

# Start the production server
pnpm start
```

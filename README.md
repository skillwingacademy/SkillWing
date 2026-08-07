# SkillSphere — Course Management Platform

A full-stack MERN LMS for browsing courses, purchasing enrollments via Stripe (Card + UPI), and attending live classes through Zoom.

## Tech Stack

- **Frontend:** React 19 (Vite) + Tailwind CSS v4
- **Backend:** Node.js + Express.js
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT + bcrypt + Google OAuth
- **Payments:** Stripe Checkout (Card + UPI)

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB running locally (or Atlas URI)
- Stripe account (test keys)
- Google Cloud Console project with OAuth 2.0 Client ID
- Zoom Server-to-Server OAuth app (for platform-generated Zoom meetings)

### 1. Backend Setup

```bash
cd server
cp .env.example .env
# Edit .env with your actual values:
#   MONGO_URI, JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
#   GOOGLE_CLIENT_ID, ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET
npm install
npm run dev
```

### 2. Frontend Setup

```bash
cd client
# Create .env with: VITE_GOOGLE_CLIENT_ID=your_google_client_id
npm install
npm run dev
```

### 3. Stripe Webhook (for local dev)

```bash
# Install Stripe CLI, then:
stripe listen --forward-to localhost:5000/api/payments/webhook
# Copy the webhook signing secret to .env as STRIPE_WEBHOOK_SECRET
```

## Environment Variables

### Server (`server/.env`)
| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRE` | JWT expiration (e.g., 30d) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `CLIENT_URL` | Frontend URL (http://localhost:5173) |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `ZOOM_ACCOUNT_ID` | Zoom Server-to-Server OAuth account ID |
| `ZOOM_CLIENT_ID` | Zoom Server-to-Server OAuth client ID |
| `ZOOM_CLIENT_SECRET` | Zoom Server-to-Server OAuth client secret |

### Client (`client/.env`)
| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID |

## Features

- 🔐 JWT + Google OAuth authentication
- 👨‍🎓 Student dashboard with enrolled courses
- 👩‍🏫 Teacher portal for course & session management
- 💳 Stripe Checkout (Card + UPI payments)
- 📹 Live class join via generated Zoom meetings
- ⏰ Zoom meeting generation is available 15 minutes before start; Zoom controls host entry and its waiting room
- 🎨 Premium dark UI with glassmorphism

## Zoom setup

Create a **Server-to-Server OAuth** app in Zoom Marketplace and add the meeting-creation scope plus the report scope required for participant reporting. Put the account ID, client ID, and client secret in `server/.env` using the names above. The generated Zoom host URL is stored separately from the student join URL and is returned only through the teacher/admin host-launch endpoint.

After a completed session ends, the server polls Zoom reports every five minutes. Participant reporting requires a Zoom plan and app permissions that permit the Report API; unavailable reports are retried, while authorization/configuration failures are recorded on the session telemetry.

# skill-wing  

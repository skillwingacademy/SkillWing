# SkillSphere — Course Management Platform

A full-stack MERN LMS for browsing courses, purchasing enrollments via Stripe (Card + UPI), and attending live classes through Google Meet.

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

### 1. Backend Setup

```bash
cd server
cp .env.example .env
# Edit .env with your actual values:
#   MONGO_URI, JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, GOOGLE_CLIENT_ID
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

### Client (`client/.env`)
| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID |

## Features

- 🔐 JWT + Google OAuth authentication
- 👨‍🎓 Student dashboard with enrolled courses
- 👩‍🏫 Teacher portal for course & session management
- 💳 Stripe Checkout (Card + UPI payments)
- 📹 Live class join via Google Meet links
- ⏰ Time-gated meet link visibility (15 min before start)
- 🎨 Premium dark UI with glassmorphism
# skill-wing  

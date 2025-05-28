# RunAI - Quick Start Guide

## Prerequisites

* **Node.js** 18+ (includes npm)
* **PostgreSQL** running locally

  * A PostgreSQL user with permission to create databases
* **Firebase** project (free tier is fine)

## Setup Instructions

### 1. Create Database & User (PostgreSQL)

```bash
createdb runai
createuser -P runai_user           # Choose a password
psql -c "GRANT ALL ON DATABASE runai TO runai_user;"
```

### 2. Clone the Repository

```bash
git clone https://github.com/darshitpatel1/runai-flow.git
cd runai
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file at the project root:

```bash
cp .env.example .env
```

Or manually create `.env` with the following values:

```
DATABASE_URL=postgres://runai_user:your_db_password@localhost:5432/runai
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_APP_ID=1:your_app_id:web:your_web_id
VITE_FIREBASE_PROJECT_ID=your_project_id
```

### 5. Configure Firebase

* Go to [Firebase Console](https://console.firebase.google.com)
* Create a new project
* Go to **Authentication** → **Sign-in method** → Enable **Google provider**
* Add `http://localhost:5000` to **Authorized domains**
* Copy and paste your Firebase API Key, App ID, and Project ID into `.env`

### 6. Push Schema & Seed Data (Optional)

```bash
npm run db:push   # Creates tables from Prisma/Drizzle schema
npm run db:seed   # Populates sample data (optional)
```

### 7. Start the Development Server

```bash
npm run dev
```

Visit [http://localhost:5000](http://localhost:5000) to see the app in action.

---

## Troubleshooting

* Double-check values in `.env` (no quotes, correct credentials)
* Ensure PostgreSQL service is running and `DATABASE_URL` is reachable
* Make sure ports **5000** (Vite) and **5432** (Postgres) are not in use

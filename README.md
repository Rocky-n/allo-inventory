# Allo Engineering Take-Home: Inventory Reservation System

A high-concurrency inventory reservation platform built to eliminate checkout race conditions. 

**Live Demo:** https://allo-inventory-pr.vercel.app/

## System Architecture & Tech Stack
* **Frontend:** Next.js (App Router), Tailwind CSS, shadcn/ui
* **Database:** PostgreSQL (hosted on Supabase)
* **ORM:** Prisma (v7 adapter architecture)
* **Concurrency Control:** Upstash Redis

## Core Mechanisms Built

### 1. Concurrency Handling (The Race Condition)
To prevent negative inventory during high-traffic events, the system utilizes a **Distributed Lock** pattern via Redis. 
* When a reservation request hits the API, it attempts to acquire a Redis lock using `SET NX` unique to the `productId` and `warehouseId`.
* If the lock is denied, the server immediately returns a `409 Conflict`, ensuring the database is never overwhelmed by simultaneous writes to the same row.
* If acquired, the system uses a Prisma `$transaction` to securely increment the `reservedUnits` and create a pending order.

### 2. Bonus: Idempotency (Network Resiliency)
Both the Reserve and Confirm endpoints are fully idempotent to prevent double-billing or double-reserving if a user's network connection drops and their client retries the request.
* The frontend generates a unique UUID (`Idempotency-Key` header) for each distinct checkout action.
* The server checks Redis for this key. If found, it bypasses the database entirely and returns the cached successful response.

### 3. Automated Expiry (Cart Abandonment)
Reservations are granted a strict 10-minute hold. A Next.js API route (`/api/cron/release-expired`) acts as a garbage collector, querying for expired `PENDING` orders and transactionally returning their stock to the available pool.
* **Note on Deployment & Vercel Constraints:** In a paid production environment, this cron job would run every minute (`* * * * *`). However, to comply with Vercel's Hobby tier limitations (which strictly cap crons to one execution per day), the schedule in `vercel.json` is configured to run at midnight (`0 0 * * *`). The expiration logic itself remains fully capable of near-real-time sweeps.

## Local Setup Instructions

1. Clone the repository and install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Configure Environment Variables in a `.env` file:
   \`\`\`env
   DATABASE_URL="your_pooled_postgres_url"
   DIRECT_URL="your_direct_postgres_url"
   UPSTASH_REDIS_REST_URL="your_upstash_url"
   UPSTASH_REDIS_REST_TOKEN="your_upstash_token"
   \`\`\`

3. Run migrations and seed the database:
   \`\`\`bash
   npx prisma migrate dev --name init
   npx prisma db seed
   \`\`\`

4. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`
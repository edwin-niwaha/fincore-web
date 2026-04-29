# FinCore Web

FinCore Web is a modern **admin, staff, and client dashboard** for FinCore, built with **Next.js, TypeScript, and Tailwind CSS**.

It connects directly to `fincore-api` and supports JWT-based authentication, role-based redirects, protected dashboards, and real API integration.

---

## Purpose

FinCore Web is designed to help users manage:

- Clients
- Savings accounts
- Loan lifecycle
- Accounting operations
- Reports and analytics
- Dashboard summaries
- Transactions
- User profile access

---

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Axios or Fetch API
- React Context or Zustand
- JWT authentication
- Typed API client

---

## Project Structure

```txt
fincore-web/
├── app/
├── components/
├── features/
│   ├── clients/
│   ├── savings/
│   ├── loans/
│   ├── accounting/
│   └── reports/
├── lib/
│   ├── api/
│   └── auth/
├── hooks/
├── types/
├── styles/
├── middleware.ts
└── .env.example
```

---

## ⚙️ Setup

```bash
git clone https://github.com/your-org/fincore-web.git
cd fincore-web

npm install

cp .env.example .env.local

npm run dev

NEXT_PUBLIC_API_BASE_URL=http://localhost:8000


npm run dev
npm run build
npm run lint
npm run check
```

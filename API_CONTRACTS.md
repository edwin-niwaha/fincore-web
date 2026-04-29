# FinCore Web API Contracts

`NEXT_PUBLIC_API_BASE_URL` should be the backend origin, for example `http://localhost:8000`.
Frontend endpoint constants already include `/api/v1/`.

## Required live endpoints

- `GET /api/v1/health/` -> `{ status, service, database }`
- `POST /api/v1/auth/login/` -> `{ user, tokens: { access, refresh } }`
- `POST /api/v1/auth/register/` -> `{ user, tokens: { access, refresh }, detail }`
- `POST /api/v1/auth/refresh/` -> `{ access: string }`
- `POST /api/v1/auth/logout/` -> `{ detail: string }`
- `GET /api/v1/auth/me/` -> `User`
- `POST /api/v1/auth/forgot-password/` -> `{ detail: string }`
- `POST /api/v1/auth/reset-password/` -> `{ detail: string }`
- `POST /api/v1/auth/send-email-verification/` -> `{ detail: string }`
- `POST /api/v1/auth/verify-email/` -> `{ detail: string, user: User }`
- `GET /api/v1/dashboards/admin/` -> admin dashboard summary
- `GET /api/v1/dashboards/staff/` -> staff dashboard summary
- `GET /api/v1/dashboards/client/` -> client dashboard summary
- `GET /api/v1/institutions/` -> paginated or array of institutions
- `POST /api/v1/institutions/` -> institution create for super admins
- `PATCH /api/v1/institutions/:id/` -> scoped institution update
- `GET /api/v1/branches/` -> paginated or array of branches
- `POST /api/v1/branches/` -> scoped branch create for admins
- `PATCH /api/v1/branches/:id/` -> scoped branch update
- `GET /api/v1/clients/` -> paginated or array of clients
- `GET /api/v1/clients/:id/` -> client profile
- `GET /api/v1/savings/accounts/` -> paginated or array of savings accounts
- `GET /api/v1/loans/applications/` -> paginated or array of loan applications
- `GET /api/v1/loans/repayments/` -> paginated or array of repayments
- `GET /api/v1/transactions/` -> paginated or array of transactions

## UI contracts still pending

- Reports detail pages: expected `GET /api/v1/reports/?type=<report>&start_date=&end_date=`
- Users and roles page: expected `GET /api/v1/users/`, `POST /api/v1/users/`, `PATCH /api/v1/users/:id/`
- Settings page: expected institution and branch settings endpoints
- Audit logs page: expected `GET /api/v1/audit-logs/`

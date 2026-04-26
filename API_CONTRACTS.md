# FinCore Web API Contracts

All endpoints are relative to `NEXT_PUBLIC_API_BASE_URL`.

## Required live endpoints

- `POST /auth/login/` → `{ access: string, refresh: string, user?: User }`
- `POST /auth/refresh/` → `{ access: string }`
- `POST /auth/logout/` → `204 No Content`
- `GET /auth/profile/` → `User`
- `GET /dashboards/admin/` → admin dashboard summary
- `GET /dashboards/staff/` → staff dashboard summary
- `GET /dashboards/client/` → client dashboard summary
- `GET /clients/` → paginated or array of clients
- `GET /clients/:id/` → client profile
- `GET /savings/accounts/` → paginated or array of savings accounts
- `GET /loans/applications/` → paginated or array of loan applications
- `GET /loans/repayments/` → paginated or array of repayments
- `GET /transactions/` → paginated or array of transactions

## TODO contracts

These routes are present in the UI but should be fully wired when backend response shapes are finalized:

- Reports detail pages: expected `GET /reports/?type=<report>&start_date=&end_date=`
- Users and roles: expected `GET /users/`, `POST /users/`, `PATCH /users/:id/`
- Settings: expected institution/branch settings endpoints
- Audit logs: expected `GET /audit-logs/`

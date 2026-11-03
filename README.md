# Smart Employee Management System

A full-stack employee management application for organizations that need a shared place to manage people, attendance, leave, and departments. The interface is a responsive admin workspace. Every primary action is saved through the API and MongoDB.

## Features

- JWT authentication with bcrypt password hashing, logout that invalidates the session, and role-based access for admins and employees
- Employee directory with search, filters, sorting, pagination, create, edit, detail, and deactivation
- Department management with unique names, managers, employee counts, and safe deletion
- Attendance check-in and check-out, one record per employee per day, working hours, monthly calendar, admin filters, and CSV export
- Leave requests for casual, sick, and earned leave, with overlap checks, balance rules, approval, rejection, and cancellation
- Dashboards calculated from stored records, in-app notifications, and profile updates limited to permitted fields

## Technology stack

- Frontend: React, Vite, Tailwind CSS, React Router, Axios, React Hook Form, Zod, Recharts, Lucide, Sonner
- Backend: Node.js, Express, MongoDB, Mongoose, JWT, bcryptjs, Zod, Helmet, CORS, express-rate-limit
- Tests: Vitest, React Testing Library, Supertest, Playwright

Passwords are hashed with the bcrypt algorithm through `bcryptjs`, which avoids a native build step on Windows.

## Architecture

The React client calls a versioned JSON API. Express validates each request, checks the JWT and role on the server, and reads or writes MongoDB through Mongoose. Employees own their attendance, leave, and profile records. Admin-only routes are rejected for employee tokens even if the interface is bypassed.

```text
client/   React workspace
server/   Express API, models, seed, and tests
```

### Folder structure

```text
client/src
  components/   shared UI, layout, and feature components
  pages/        routed screens
  services/     Axios API layer
  context/      authentication state
  validations/  form schemas
server/src
  config/       environment and database
  controllers/  HTTP handlers
  models/       Mongoose schemas
  routes/       API routes
  services/     business rules
  validators/   request schemas
  middleware/   auth, validation, errors, rate limits
  seed/         demo data
  tests/        API and policy tests
```

## Installation

Requirements: Node.js 18 or newer, and MongoDB running locally or on MongoDB Atlas.

```bash
npm run install:all
```

That installs the root helper, the API, and the client.

## Environment configuration

Copy the examples and fill in real values:

```bash
copy server\.env.example server\.env
copy client\.env.example client\.env.development
```

`server/.env`:

```text
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/smart-ems
JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRES_IN=8h
CLIENT_URL=http://localhost:5173
APP_TIMEZONE=Asia/Kolkata
BCRYPT_ROUNDS=12
```

`client/.env.development`:

```text
VITE_API_URL=http://localhost:5000/api
```

The API URL is read from `VITE_API_URL`. Production builds should set that variable to the deployed API origin before `npm run build`. A development `.env` is already ignored by git when named `.env`. The checked-in development file points at the local API and contains no secrets.

## MongoDB setup

**Local MongoDB**

1. Install [MongoDB Community Server](https://www.mongodb.com/try/download/community).
2. Start the database service.
3. Use `mongodb://127.0.0.1:27017/smart-ems` as `MONGODB_URI`.

**MongoDB Atlas**

1. Create a free cluster and a database user.
2. Allow your IP address under Network Access.
3. Copy the connection string into `MONGODB_URI` in `server/.env`.
4. Replace `<password>` and set the database name, for example `smart-ems`.

Transactions are used for employee creation and leave approval. Atlas and replica sets support them. A standalone local MongoDB falls back to a non-transactional write so the same code still runs.

## Seed data

Seeding is manual. It refuses to run when `NODE_ENV=production`.

```bash
npm run seed
```

The script is safe to run more than once. It resets the two demo passwords and will not duplicate departments, employees, or seeded leave rows.

### Demo credentials

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@smartsystem.com | Admin@123 |
| Employee | employee@smartsystem.com | Employee@123 |

The seed also creates 3 departments and 10 employees. Other seeded employees use `Employee@123`.

## Run the app

From the project root, start the API and the client together:

```bash
npm run dev
```

Or separately:

```bash
npm run dev --prefix server
npm run dev --prefix client
```

- API: http://localhost:5000
- Health: http://localhost:5000/api/health
- Client: http://localhost:5173

## Testing

```bash
npm run lint
npm test
npm run build
npm run test:e2e
```

- `npm test` runs the API suite and the React suite.
- API tests start an in-memory MongoDB replica set, so they do not need a local database.
- `npm run build` creates the production client in `client/dist`.
- `npm run test:e2e` starts an isolated API backed by in-memory MongoDB, seeds it, starts Vite, and runs the admin, employee, and authorization workflows in Chromium.

Install the Playwright browser once:

```bash
npx playwright install chromium --prefix client
```

## API endpoints

| Method | Path | Access |
| --- | --- | --- |
| POST | /api/auth/login | Public |
| POST | /api/auth/logout | Signed in |
| GET | /api/auth/me | Signed in |
| POST | /api/auth/change-password | Signed in |
| GET, POST | /api/employees | Admin |
| GET | /api/employees/:id | Admin, or the employee themselves |
| PUT, DELETE | /api/employees/:id | Admin. Delete deactivates the person |
| GET, POST | /api/departments | Admin |
| PUT, DELETE | /api/departments/:id | Admin |
| POST | /api/attendance/check-in | Employee |
| POST | /api/attendance/check-out | Employee |
| GET | /api/attendance/me | Employee |
| GET | /api/attendance | Signed in. Employees only see their own rows |
| GET | /api/attendance/stats | Admin |
| GET | /api/attendance/export | Admin |
| GET | /api/attendance/:id | Owner or admin |
| POST | /api/leaves | Employee |
| GET | /api/leaves/me | Employee |
| GET | /api/leaves | Admin |
| GET | /api/leaves/:id | Owner or admin |
| PATCH | /api/leaves/:id/approve | Admin |
| PATCH | /api/leaves/:id/reject | Admin |
| PATCH | /api/leaves/:id/cancel | Employee, pending requests only |
| GET | /api/dashboard/admin | Admin |
| GET | /api/dashboard/employee | Employee |
| GET | /api/notifications | Signed in |
| PATCH | /api/notifications/:id/read | Owner |
| PATCH | /api/notifications/read-all | Owner |
| GET, PUT | /api/profile | Signed in |
| GET | /api/settings | Signed in |
| GET | /api/health | Public |

Successful responses use `{ success, message, data }`. Lists also include `pagination` where the collection is paged. Errors use `{ success: false, message }`.

## Business rules

- Office start is 09:30 in `APP_TIMEZONE`. A check-in after that is late. Fewer than 4 worked hours is a half day.
- Attendance timestamps come from the server. A second check-in or check-out on the same day is rejected.
- Approved leave deducts the balance once. Rejected, pending, and cancelled requests do not.
- A department cannot be deleted while employees are still assigned to it.
- Employees cannot read or change another employee's records.

## Deployment

1. Set `NODE_ENV=production`, a long random `JWT_SECRET`, the Atlas `MONGODB_URI`, and `CLIENT_URL` to the deployed frontend origin.
2. Start the API with `npm start --prefix server`.
3. Build the client with `VITE_API_URL` set to the public API, for example `https://api.example.com/api`.
4. Serve `client/dist` from any static host.
5. Confirm `GET /api/health` reports `db: connected`.

Do not run the seed script in production. It is blocked when `NODE_ENV=production`.

This repository does not deploy itself. The steps above are the configuration required to deploy it.

## Troubleshooting

- **Environment validation failed:** `JWT_SECRET` must be at least 16 characters and `MONGODB_URI` must be set.
- **API cannot connect:** confirm MongoDB is running, or that the Atlas user, password, and IP allow list are correct.
- **Browser requests fail:** `CLIENT_URL` must match the frontend origin, including the port.
- **Login says the account is deactivated:** an admin deactivated that employee. Edit the employee and set the status back to active.
- **End-to-end tests cannot start:** free ports 5000 and 5173, then install Chromium with the Playwright command above. The first run downloads a MongoDB binary for the isolated test database.

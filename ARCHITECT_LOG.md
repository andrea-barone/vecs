# ARCHITECT_LOG — Overnight Build Session

**Started:** 2026-03-24 00:06 CET
**Target:** ~07:00 CET
**Mission:** Make VECS substantially complete as a technical debugging tool for OCPI 2.2.1 eMSP integrations

---

## Current State Assessment (00:06)

### What Exists:
- ✅ Express + TypeScript backend with PostgreSQL
- ✅ Location/EVSE/Connector CRUD (full)
- ✅ Tariffs CRUD (full)
- ✅ Basic eMSP registration (credentials endpoint)
- ✅ Docker stack running (postgres, backend, nginx frontend)
- ✅ React frontend with inline forms for location management
- ✅ Database tables for sessions, cdrs, tokens (empty, no endpoints)

### What's Missing (by priority):
1. **Request/Response Logging** — CRITICAL for debugging tool
   - No logging middleware
   - No logs table
   - No UI to view logs
   
2. **Multi-tenancy** — Companies isolating data
   - No companies table
   - No admin users table
   - No company_id on locations/tariffs
   
3. **OCPI Modules** — Sessions, CDRs, Tokens, Commands
   - Tables exist but no service/route implementation
   - No OCPI-compliant endpoints
   
4. **Push Notifications** — Track outbound pushes
   - No push log table
   - No push mechanism
   
5. **Charge Simulation** — Manual session control
   - No simulation endpoints
   - No meter value generation
   
6. **Technical Admin UI** — JSON viewers, filters
   - Basic UI exists but no raw JSON views
   - No request log viewer

---

## Architecture Plan

### Phase 1: Request/Response Logging (PRIORITY 1)

**New Files:**
- `src/middleware/requestLogger.ts` — Log all requests to DB
- `src/services/logs.service.ts` — Query logs
- `src/routes/admin.ts` — Admin endpoints for logs

**Database:**
```sql
CREATE TABLE ocpi_logs (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  direction VARCHAR(10) NOT NULL, -- 'INBOUND' or 'OUTBOUND'
  method VARCHAR(10) NOT NULL,
  path TEXT NOT NULL,
  request_headers JSONB,
  request_body JSONB,
  response_status INTEGER,
  response_headers JSONB,
  response_body JSONB,
  duration_ms INTEGER,
  emsp_token VARCHAR(255),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_logs_timestamp ON ocpi_logs(timestamp DESC);
CREATE INDEX idx_logs_path ON ocpi_logs(path);
CREATE INDEX idx_logs_emsp ON ocpi_logs(emsp_token);
```

**Frontend:**
- New `LogViewer.tsx` component with filters and JSON display

### Phase 2: Multi-tenancy

**Database:**
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  party_id VARCHAR(3) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admin_users (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add company_id to existing tables
ALTER TABLE locations ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE tariffs ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE emsp_credentials ADD COLUMN company_id UUID REFERENCES companies(id);
```

### Phase 3: Sessions & CDRs

**Endpoints:**
- `GET /ocpi/2.2.1/sessions` — List sessions
- `GET /ocpi/2.2.1/sessions/:session_id` — Get session
- `PUT /ocpi/2.2.1/sessions/:session_id` — Update session (eMSP receiver)
- `GET /ocpi/2.2.1/cdrs` — List CDRs
- `GET /ocpi/2.2.1/cdrs/:cdr_id` — Get CDR

### Phase 4: Charge Simulation

**Admin Endpoints:**
- `POST /admin/simulate/start` — Start charging session
- `POST /admin/simulate/meter-update` — Update meter values
- `POST /admin/simulate/stop` — Stop session and generate CDR

### Phase 5: Push Notifications

**Database:**
```sql
CREATE TABLE push_logs (
  id UUID PRIMARY KEY,
  emsp_id UUID REFERENCES emsp_credentials(id),
  endpoint_type VARCHAR(50), -- 'locations', 'sessions', 'cdrs'
  method VARCHAR(10),
  url TEXT,
  request_body JSONB,
  response_status INTEGER,
  response_body JSONB,
  success BOOLEAN,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Execution Log

### Task 1: Request/Response Logging (00:15)
**Status:** ✅ COMPLETE (00:18)

Implemented:
- `src/middleware/requestLogger.ts` - Logs all OCPI requests to `ocpi_logs` table
- `src/services/logs.service.ts` - Query logs with filtering
- `src/routes/admin.ts` - Admin API for logs
- `frontend/src/components/LogViewer.tsx` - UI with filters, JSON viewer, auto-refresh
- `push_logs` table for outbound notification tracking

All OCPI requests now logged with:
- Full request/response headers and bodies
- Duration in ms
- eMSP token tracking
- Query parameters

### Task 2: Sessions & CDRs (00:12)
**Status:** ✅ COMPLETE (00:18)

Implemented:
- `src/services/sessions.service.ts` - Full session lifecycle
- `src/services/cdrs.service.ts` - CDR generation
- Sessions/CDRs endpoints in `src/routes/ocpi.ts`
- OCPI 2.2.1 versions endpoint

### Task 3: Charge Simulation (00:15)
**Status:** ✅ COMPLETE (00:18)

Implemented:
- `src/services/simulation.service.ts` - Start/stop/meter updates
- `src/routes/simulation.ts` - Admin simulation API
- `frontend/src/components/SessionManager.tsx` - UI with:
  - Sessions list with JSON viewer
  - CDRs list with JSON viewer
  - Interactive simulation panel
  - Meter value controls
  - Quick increment buttons

### Task 4: Next Priority - Tokens Module (00:19)
**Status:** Starting now


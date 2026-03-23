# VECS Interface — Complete Setup Guide

## What You Just Got

A **production-ready OCPI 2.2.1 CPO simulator** with both a powerful REST API backend AND a beautiful web dashboard frontend.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│         React TypeScript Frontend (Vite)            │
│         http://localhost:5173                       │
│  ┌─────────────────────────────────────────────┐   │
│  │ Dashboard                                   │   │
│  │ ├── Register eMSP                          │   │
│  │ ├── Create Locations                       │   │
│  │ ├── Add EVSEs (Charge Points)             │   │
│  │ └── Configure Connectors                  │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ API Calls
                   │ (Bearer Token)
                   ▼
┌─────────────────────────────────────────────────────┐
│    Node.js + Express Backend (TypeScript)           │
│         http://localhost:3000                       │
│  ┌─────────────────────────────────────────────┐   │
│  │ OCPI 2.2.1 Endpoints                       │   │
│  │ ├── POST /credentials (register)           │   │
│  │ ├── GET /locations (list)                  │   │
│  │ ├── POST /locations (create)               │   │
│  │ ├── GET /locations/:id (detail)            │   │
│  │ ├── POST /locations/:id/evses (add EVSE)  │   │
│  │ └── POST /.../connectors (add connector)  │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ SQL Queries
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│        PostgreSQL Database                          │
│  ├── emsp_credentials                              │
│  ├── locations                                      │
│  ├── evses                                          │
│  ├── connectors                                     │
│  └── (reserved for Phase 2)                         │
└─────────────────────────────────────────────────────┘
```

## Quick Start (5 minutes)

### 1. Prerequisites
```bash
# Check you have these:
node --version   # v18+
psql --version   # PostgreSQL 12+
npm --version    # latest
```

### 2. Setup Database
```bash
createdb vecs
```

### 3. Start Everything
```bash
cd /home/barone/vecs
npm install
cd frontend && npm install && cd ..
npm run dev:all
```

### 4. Open Dashboard
```
http://localhost:5173
```

That's it! You're running a full OCPI simulator.

## Using the Web Dashboard

### Register as eMSP (Step 1)
1. You'll see the registration form
2. Fill in:
   - **Party ID:** ABC (3 letters)
   - **Country Code:** DE (2 letters)
   - **Business Name:** Your eMSP name
   - **Website:** (optional)
3. Click **Register & Get Token**
4. Token auto-saves to your browser

### Create Charging Locations (Step 2)
1. Switch to **Create** tab
2. Fill in location details:
   - Location ID: LOC-001
   - Address: Main Street 123
   - City: Berlin
   - Country: DE
   - Postal Code: 10115
   - Coordinates: 52.5200, 13.4050
   - Operator: (optional)
3. Click **Create Location**

### Add Charge Points (Step 3)
1. Click **Locations** tab
2. Click a location card to expand
3. Switch to **Create** tab
4. Enter EVSE details:
   - EVSE ID: EVSE-001
   - Status: AVAILABLE
5. Click **Add EVSE**

### Add Connectors (Step 4)
1. For each EVSE, add a connector:
   - Connector ID: 1
   - Standard: IEC_62196_T2_COMBO
   - Format: CABLE
   - Power Type: DC
   - Voltage: 400V
   - Amperage: 125A
   - Power: 50kW
2. Click **Add Connector**

### View Your Network
- **Locations tab** shows all locations
- Click any card to see EVSEs
- Expand EVSEs to see connectors
- Real-time updates as you add more

## Using the REST API

### Via cURL

```bash
# 1. Register
TOKEN=$(curl -s -X POST http://localhost:3000/ocpi/2.2.1/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "party_id": "ABC",
    "country_code": "DE",
    "business_details": {"name": "Test eMSP"}
  }' | jq -r '.data.token')

# 2. Create location
curl -X POST http://localhost:3000/ocpi/2.2.1/locations \
  -H "Content-Type: application/json" \
  -d '{
    "location_id": "LOC-001",
    "address": "Main 123",
    "city": "Berlin",
    "postal_code": "10115",
    "country": "DE",
    "latitude": 52.5200,
    "longitude": 13.4050
  }'

# 3. List locations
curl -H "Authorization: Token $TOKEN" \
  http://localhost:3000/ocpi/2.2.1/locations | jq

# 4. Add EVSE
curl -X POST http://localhost:3000/ocpi/2.2.1/locations/LOC-001/evses \
  -H "Content-Type: application/json" \
  -d '{
    "evse_id": "EVSE-001",
    "status": "AVAILABLE"
  }'

# 5. Add connector
curl -X POST \
  http://localhost:3000/ocpi/2.2.1/locations/LOC-001/evses/EVSE-001/connectors \
  -H "Content-Type: application/json" \
  -d '{
    "connector_id": "1",
    "standard": "IEC_62196_T2_COMBO",
    "format": "CABLE",
    "power_type": "DC",
    "voltage": 400,
    "amperage": 125,
    "power_kw": 50
  }'
```

## File Structure

```
vecs/
├── README.md                  # Main overview
├── FRONTEND.md               # Web dashboard docs
├── DEVELOPMENT.md            # Backend dev guide
├── PROJECT_STATUS.md         # What's implemented
│
├── src/                      # Backend TypeScript
│   ├── database/migrations.ts    (Database schema)
│   ├── middleware/auth.ts        (Token validation)
│   ├── routes/ocpi.ts            (All OCPI endpoints)
│   ├── services/                 (Business logic)
│   ├── types/ocpi.ts             (Type definitions)
│   └── index.ts                  (Server)
│
├── frontend/                 # React TypeScript
│   ├── src/
│   │   ├── components/           (5 form components)
│   │   ├── App.tsx               (Main app)
│   │   ├── App.css               (All styling)
│   │   └── main.tsx
│   ├── vite.config.ts            (API proxy)
│   └── index.html
│
├── dist/                     # Compiled backend
├── package.json              # Root (run both servers)
└── .env                      # Config
```

## Key Files

### Backend Configuration
- **`.env`** — Database URL, port, logging
- **`src/index.ts`** — Express server setup
- **`src/database/migrations.ts`** — Database schema

### Frontend Configuration
- **`frontend/.env.local`** — API URL
- **`frontend/vite.config.ts`** — Dev proxy + build config
- **`frontend/src/App.tsx`** — Main app routing

## Running Modes

### Development (Recommended)
```bash
npm run dev:all
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
# Hot reload on both
```

### Backend Only
```bash
npm run dev
# http://localhost:3000
# Use with curl/Postman/insomnia
```

### Frontend Only (with API proxy)
```bash
npm run dev:frontend
# http://localhost:5173
# Proxies /ocpi/* to backend
```

### Production Build
```bash
npm run build
npm start
# Backend only, compiled JS
# Frontend built into dist/ (serve separately)
```

## Database

### Auto-Migrations
- Schema auto-creates on first run
- 8 tables pre-created (4 used in MVP)
- No manual schema setup needed

### Manual Reset
```bash
# Drop and recreate database
dropdb vecs
createdb vecs
npm run dev  # Will auto-migrate again
```

## API Response Format

All responses follow OCPI 2.2.1 standard:

```json
{
  "data": { /* response data */ },
  "status_code": 1000,  // 1xxx = success, 2xxx = error, 3xxx = validation
  "status_message": "Success",
  "timestamp": "2026-03-23T10:07:00.000Z"
}
```

## Common Tasks

### View All Locations
**Dashboard:** Click **Locations** tab
**API:**
```bash
curl -H "Authorization: Token $TOKEN" \
  http://localhost:3000/ocpi/2.2.1/locations
```

### Create New Location
**Dashboard:** Click **Create** → Fill form → Submit
**API:**
```bash
curl -X POST http://localhost:3000/ocpi/2.2.1/locations \
  -H "Content-Type: application/json" \
  -d '{ "location_id": "...", ... }'
```

### Add EVSE to Location
**Dashboard:** Select location → Click **Create** → Add EVSE
**API:**
```bash
curl -X POST http://localhost:3000/ocpi/2.2.1/locations/LOC-001/evses \
  -H "Content-Type: application/json" \
  -d '{ "evse_id": "EVSE-001", ... }'
```

## Troubleshooting

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
psql postgres -c "SELECT version();"

# Check database exists
psql -l | grep vecs

# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

### "Port 3000 already in use"
```bash
# Change in .env
echo "PORT=3001" >> .env

# Or kill process
lsof -ti:3000 | xargs kill -9
```

### "Token invalid when making API calls"
- Check Authorization header: `Token VECS-xxx` (not `Bearer`)
- Check token hasn't expired (valid 1 year)
- Check token matches what was returned on registration

### "Frontend can't connect to API"
- Verify backend is running: `curl http://localhost:3000/health`
- Check `VITE_API_URL` in `frontend/.env.local`
- Check browser console for CORS errors

### "Build fails"
```bash
# Clean and rebuild
rm -rf dist frontend/dist
npm run build

# Or build separately
npm run build  # Backend
cd frontend && npm run build  # Frontend
```

## Documentation

| Document | Content |
|----------|---------|
| **README.md** | Overview, features, setup |
| **FRONTEND.md** | Web dashboard, UI, components |
| **DEVELOPMENT.md** | Backend setup, testing, debugging |
| **PROJECT_STATUS.md** | What's implemented, roadmap |
| **INTERFACE.md** | This file — how to use everything |

## Next Steps

### For Testing
1. Run `npm run dev:all`
2. Register as eMSP
3. Create test locations with real coordinates
4. Verify data via API calls
5. Test with your eMSP client

### For Development
1. Read `DEVELOPMENT.md` for backend architecture
2. Read `FRONTEND.md` for component structure
3. Read `src/types/ocpi.ts` for full OCPI types
4. Start building Phase 2 features (Sessions, CDRs)

### For Production
1. Build everything: `npm run build`
2. Set `.env` with production database URL
3. Use PM2/systemd for process management
4. Serve frontend separately (nginx/cdn)
5. Add HTTPS/SSL certificates

## Support

- Backend issues → Check `DEVELOPMENT.md`
- Frontend issues → Check `FRONTEND.md`
- API questions → Read `src/types/ocpi.ts`
- OCPI spec → https://github.com/ocpi/ocpi

---

**You're all set!** 🎉 Start with `npm run dev:all` and open http://localhost:5173

# VECS — Virtual Electric Charging Station Simulator

A virtual OCPI 2.2.1 CPO (Charge Point Operator) for testing eMSP (eMobility Service Provider) integrations. Includes both a powerful backend API and a beautiful, user-friendly web dashboard.

## Overview

VECS simulates a complete charging network operator with realistic OCPI endpoints. eMSPs can:
- Register and get API credentials
- Fetch charging locations with real-time data
- Create and manage EVSEs (charge points)
- Configure connectors with realistic specifications
- Test their OCPI implementations against a fully-featured virtual CPO

All through both REST API and an intuitive web interface.

**Status:** MVP with Credentials, Locations, EVSEs, and Connectors implemented.

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- PostgreSQL database
- OCPI 2.2.1 standard compliant
- Bearer token authentication

### Frontend
- React 19 + TypeScript
- Vite for fast dev/build
- Modern CSS3 (no framework dependencies)
- Responsive mobile-first design
- Real-time API integration

## Setup

### Prerequisites

- Node.js v18+
- PostgreSQL 12+
- npm or yarn

### Installation

```bash
# Clone and install
git clone git@github.com:andrea-barone/vecs.git
cd vecs
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..

# Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL connection string
```

### Environment Variables

**Backend** (`.env` in root):
```env
DATABASE_URL=postgresql://vecs:vecs@localhost:5432/vecs
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
BASE_URL=http://localhost:3000
```

**Frontend** (`.env.local` in frontend/):
```env
VITE_API_URL=http://localhost:3000
```

### Create Database

```bash
createdb vecs
# psql vecs < schema.sql  # (auto-migrates on first run)
```

### Run

**Development (both backend + frontend):**
```bash
npm run dev:all
```

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`

**Or separately:**
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
npm run dev:frontend
```

**Production build:**
```bash
npm run build
npm start
```

## Web Dashboard

The frontend provides an intuitive UI for managing your virtual CPO:

### Features
- 🎨 **Beautiful Dashboard** — Modern gradient design
- 🔐 **Quick Registration** — Get API token in seconds
- 📍 **Location Management** — Create and view charging stations
- ⚡ **EVSE Management** — Add charge points to locations
- 🔌 **Connector Config** — Set connector specs (type, power, voltage)
- 💾 **Auto-save** — Token persisted to localStorage
- 📱 **Mobile-friendly** — Works on all devices
- ✨ **Real-time** — See changes immediately

### Access

Open `http://localhost:5173` in your browser after running `npm run dev:all`

### Quick Start
1. Click **Register eMSP** 
2. Fill in your party ID, country, business name
3. Copy the token (auto-saved)
4. Switch to **Locations** tab
5. Create locations, EVSEs, and connectors
6. View your network in real-time

## API Endpoints

### Authentication

All OCPI endpoints (except `/credentials` POST) require:
```
Authorization: Token <your_token>
```

### Credentials (Registration)

**POST /ocpi/2.2.1/credentials**

Register a new eMSP:
```json
{
  "party_id": "ABC",
  "country_code": "DE",
  "business_details": {
    "name": "Test eMSP",
    "website": "https://example.com",
    "logo": "https://example.com/logo.png"
  }
}
```

Response:
```json
{
  "data": {
    "token": "VECS-...",
    "url": "http://localhost:3000/ocpi/2.2.1",
    "party_id": "ABC",
    "country_code": "DE",
    "role": "CPO",
    "version": "2.2.1",
    "expires": "2025-03-23T10:07:00Z",
    "business_details": { ... }
  },
  "status_code": 1000,
  "status_message": "Credentials created successfully",
  "timestamp": "2026-03-23T10:07:00Z"
}
```

**GET /ocpi/2.2.1/credentials**

Get current token info (requires auth).

### Locations

**POST /ocpi/2.2.1/locations** (admin)

Create a new location:
```json
{
  "location_id": "LOC-001",
  "type": "PARKING_LOT",
  "name": "Downtown Charging Hub",
  "address": "Main Street 123",
  "city": "Berlin",
  "postal_code": "10115",
  "country": "DE",
  "latitude": 52.5200,
  "longitude": 13.4050,
  "operator_name": "City Chargers"
}
```

**GET /ocpi/2.2.1/locations** (requires auth)

List all locations.

**GET /ocpi/2.2.1/locations/:location_id** (requires auth)

Get specific location with EVSEs and connectors.

### EVSEs (Charge Points)

**POST /ocpi/2.2.1/locations/:location_id/evses** (admin)

Add EVSE to location:
```json
{
  "evse_id": "EVSE-001",
  "uid": "EVSE-001-UID",
  "status": "AVAILABLE"
}
```

### Connectors

**POST /ocpi/2.2.1/locations/:location_id/evses/:evse_id/connectors** (admin)

Add connector to EVSE:
```json
{
  "connector_id": "1",
  "standard": "IEC_62196_T2_COMBO",
  "format": "CABLE",
  "power_type": "DC",
  "voltage": 400,
  "amperage": 125,
  "power_kw": 50
}
```

## Project Structure

```
vecs/
├── src/                        # Backend source
│   ├── database/
│   │   └── migrations.ts       # Database schema
│   ├── middleware/
│   │   └── auth.ts             # OCPI token validation
│   ├── routes/
│   │   └── ocpi.ts             # OCPI endpoints
│   ├── services/
│   │   ├── credentials.service.ts
│   │   └── locations.service.ts
│   ├── types/
│   │   └── ocpi.ts             # TypeScript type definitions
│   └── index.ts                # Server entry point
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── CredentialsForm.tsx
│   │   │   ├── LocationForm.tsx
│   │   │   ├── LocationList.tsx
│   │   │   ├── EVSEForm.tsx
│   │   │   └── ConnectorForm.tsx
│   │   ├── App.tsx             # Main app
│   │   ├── App.css             # All styling
│   │   └── main.tsx            # Entry point
│   ├── vite.config.ts          # Vite config with API proxy
│   ├── tsconfig.json
│   └── package.json
├── dist/                       # Compiled backend
├── .env.example                # Backend env template
├── .gitignore
├── package.json                # Root package (backend + frontend)
├── tsconfig.json
└── README.md
```

## Roadmap

### Phase 1 (Done ✅)
- ✅ Credentials & Registration
- ✅ Locations CRUD
- ✅ EVSEs & Connectors
- ✅ Database schema
- ✅ Beautiful web dashboard
- ✅ Component-based frontend
- ✅ Real-time API integration

### Phase 2 (Next)
- ⬜ Sessions (charge lifecycle)
- ⬜ CDRs (charging records)
- ⬜ Commands (remote start/stop)
- ⬜ Tokens (RFID/app auth)
- ⬜ Tariffs
- ⬜ Admin dashboard & metrics

### Phase 3
- ⬜ Multi-version support (2.2, 2.3, etc.)
- ⬜ State machine & simulation (auto-transitions)
- ⬜ Error injection & test scenarios
- ⬜ OpenAPI/Swagger docs
- ⬜ WebSocket for real-time status updates
- ⬜ Advanced analytics & reporting

## Testing

### With Web UI (Easiest)
1. Run `npm run dev:all`
2. Open `http://localhost:5173`
3. Register as eMSP
4. Create locations, EVSEs, connectors
5. View everything in real-time

### With cURL (API Testing)

```bash
# 1. Register eMSP
curl -X POST http://localhost:3000/ocpi/2.2.1/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "party_id": "ABC",
    "country_code": "DE",
    "business_details": {"name": "Test eMSP"}
  }'

# Response contains token: VECS-xxx...

# 2. Create location
curl -X POST http://localhost:3000/ocpi/2.2.1/locations \
  -H "Content-Type: application/json" \
  -d '{
    "location_id": "LOC-001",
    "address": "Main 123",
    "city": "Berlin",
    "postal_code": "10115",
    "country": "DE",
    "latitude": 52.52,
    "longitude": 13.40
  }'

# 3. List locations (with token)
curl -X GET http://localhost:3000/ocpi/2.2.1/locations \
  -H "Authorization: Token VECS-xxx..."

# 4. Get specific location
curl -X GET http://localhost:3000/ocpi/2.2.1/locations/LOC-001 \
  -H "Authorization: Token VECS-xxx..."
```

## OCPI Compliance

- **Version:** 2.2.1
- **Reference:** https://github.com/ocpi/ocpi
- **Spec Validation:** All endpoints follow OCPI 2.2.1 specification

## Development

### Backend
- See `DEVELOPMENT.md` for detailed backend setup & debugging

### Frontend  
- See `frontend/README.md` for frontend development

## Code Quality

- ✅ Full TypeScript with strict mode
- ✅ OCPI 2.2.1 compliant
- ✅ Type-safe database layer
- ✅ Comprehensive error handling
- ✅ Clean component architecture
- ✅ Modern CSS3 (no CSS framework bloat)
- ✅ Git history with meaningful commits

## License

ISC

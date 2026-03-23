# VECS — Virtual Electric Charging Station Simulator

A virtual OCPI 2.2.1 CPO (Charge Point Operator) for testing eMSP (eMobility Service Provider) integrations.

## Overview

VECS simulates a complete charging network operator with realistic OCPI endpoints. eMSPs can register, fetch locations, manage sessions, and test their OCPI implementations against a fully-featured virtual CPO.

**Status:** MVP with Credentials, Locations, EVSEs, and Connectors implemented.

## Tech Stack

- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL
- **Standards:** OCPI 2.2.1
- **Auth:** Bearer token (OCPI spec)

## Setup

### Prerequisites

- Node.js v18+
- PostgreSQL 12+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL connection string
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/vecs
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
BASE_URL=http://localhost:3000
```

### Create Database

```bash
createdb vecs
```

### Run

```bash
# Development (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

Server starts at `http://localhost:3000`

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
├── src/
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
├── package.json
├── tsconfig.json
└── README.md
```

## Roadmap

### Phase 1 (Done)
- ✅ Credentials & Registration
- ✅ Locations CRUD
- ✅ EVSEs & Connectors
- ✅ Database schema

### Phase 2 (Next)
- ⬜ Sessions (charge lifecycle)
- ⬜ CDRs (charging records)
- ⬜ Commands (remote start/stop)
- ⬜ Tokens (RFID/app auth)
- ⬜ Tariffs
- ⬜ Admin API (manage state)

### Phase 3
- ⬜ Multi-version support (2.2, 2.3, etc.)
- ⬜ State machine & simulation (auto-transitions)
- ⬜ Error injection & test scenarios
- ⬜ OpenAPI/Swagger docs
- ⬜ WebSocket for real-time status

## Testing

### Example Flow

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

# 2. Create location (admin)
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

# 3. List locations (eMSP)
curl -X GET http://localhost:3000/ocpi/2.2.1/locations \
  -H "Authorization: Token VECS-xxx..."

# 4. Get specific location
curl -X GET http://localhost:3000/ocpi/2.2.1/locations/LOC-001 \
  -H "Authorization: Token VECS-xxx..."
```

## OCPI Compliance

- **Version:** 2.2.1
- **Reference:** https://github.com/ocpi/ocpi

## Contributing

- TypeScript for type safety
- OCPI spec compliance
- Comprehensive logging
- PostgreSQL for persistence

## License

ISC

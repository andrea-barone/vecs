# Development Guide

## Quick Start

### 1. PostgreSQL Setup

```bash
# Create database
createdb vecs

# Create user (optional, default postgres user works)
createuser vecs -P
```

Update `.env` with your connection string:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/vecs
```

### 2. Install & Run

```bash
npm install
npm run dev
```

The server starts at `http://localhost:3000`

### 3. Test Registration Flow

```bash
# Register eMSP
TOKEN=$(curl -s -X POST http://localhost:3000/ocpi/2.2.1/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "party_id": "ABC",
    "country_code": "DE",
    "business_details": {"name": "Test eMSP"}
  }' | jq -r '.data.token')

echo $TOKEN

# Create location
curl -X POST http://localhost:3000/ocpi/2.2.1/locations \
  -H "Content-Type: application/json" \
  -d '{
    "location_id": "LOC-001",
    "address": "Charlottenstraße 3",
    "city": "Berlin",
    "postal_code": "10115",
    "country": "DE",
    "latitude": 52.5200,
    "longitude": 13.4050
  }'

# List locations with token
curl -X GET http://localhost:3000/ocpi/2.2.1/locations \
  -H "Authorization: Token $TOKEN" | jq

# Add EVSE to location
curl -X POST http://localhost:3000/ocpi/2.2.1/locations/LOC-001/evses \
  -H "Content-Type: application/json" \
  -d '{
    "evse_id": "EVSE-001",
    "status": "AVAILABLE"
  }'

# Add connector to EVSE
curl -X POST http://localhost:3000/ocpi/2.2.1/locations/LOC-001/evses/EVSE-001/connectors \
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

# Get location with all EVSEs and connectors
curl -X GET http://localhost:3000/ocpi/2.2.1/locations/LOC-001 \
  -H "Authorization: Token $TOKEN" | jq
```

## Project Structure

```
src/
├── database/
│   └── migrations.ts          # PostgreSQL schema initialization
├── middleware/
│   └── auth.ts                # OCPI token middleware
├── routes/
│   └── ocpi.ts                # All OCPI 2.2.1 endpoints
├── services/
│   ├── credentials.service.ts # eMSP registration & auth
│   └── locations.service.ts   # Location/EVSE/Connector CRUD
├── types/
│   └── ocpi.ts                # Full OCPI type definitions
└── index.ts                   # Express server
```

## Database Schema

The migrations auto-create these tables:
- `emsp_credentials` — eMSP registrations & tokens
- `locations` — Charging stations
- `evses` — Charge points at locations
- `connectors` — Charging connectors on EVSEs
- `sessions` — (reserved for Phase 2)
- `cdrs` — (reserved for Phase 2)
- `tariffs` — (reserved for Phase 2)
- `tokens` — (reserved for Phase 2)

## Building

```bash
npm run build      # Compile TypeScript → dist/
npm start          # Run compiled JS
npm run dev        # Hot-reload with ts-node
```

## Next Phase: Sessions & CDRs

### Sessions (Start Charging)

```typescript
// POST /ocpi/2.2.1/sessions/:session_id
{
  "location_id": "LOC-001",
  "evse_uid": "EVSE-001",
  "connector_id": "1",
  "auth_id": "RF-TOKEN-123",
  "auth_method": "WHITELIST" | "AUTH_REQUEST",
  "kwh": 0,
  "currency": "EUR"
}
```

### Sessions (Stop Charging)

```typescript
// PATCH /ocpi/2.2.1/sessions/:session_id
{
  "kwh": 42.5,
  "total_cost": { "excl_vat": 10.50 }
}
```

### CDRs (Submit Final Record)

Auto-generated after session stops with:
- Total energy consumed
- Total time
- Charging periods & tariffs applied
- Final cost

## OCPI Compliance Notes

- **Version:** 2.2.1 only (MVP)
- **Status Codes:** Follow OCPI spec (1000 = success, 2xxx = errors, 3xxx = client errors)
- **Timestamps:** ISO 8601 format with timezone
- **Pagination:** Not yet implemented (all records returned)
- **Filtering:** Not yet implemented

## Testing Tools

**Quick test with curl:**
```bash
# Set token variable
export TOKEN="VECS-xxxx"

# Test auth
curl -H "Authorization: Token $TOKEN" http://localhost:3000/ocpi/2.2.1/credentials
```

**With jq for formatting:**
```bash
curl -s http://localhost:3000/ocpi/2.2.1/locations | jq '.data | length'
```

## Debugging

Enable detailed logging:
```bash
LOG_LEVEL=debug npm run dev
```

Database queries logged to console in development.

## Production Deployment

```bash
# Build
npm run build

# Set environment
export NODE_ENV=production
export DATABASE_URL=postgresql://...

# Start
npm start

# Use PM2 or similar for process management
pm2 start dist/index.js --name vecs
```

## Common Issues

### Cannot connect to database
- Check `DATABASE_URL` in `.env`
- Verify PostgreSQL is running: `psql postgres`
- Migrations auto-run on startup; check console for errors

### Token validation fails
- Token must be valid & not expired
- Authorization header format: `Token <token>` (not `Bearer`)
- Tokens expire after 1 year

### CORS errors (if calling from browser)
- Add CORS middleware to `src/index.ts`:
```typescript
app.use(cors());
```
- Install: `npm install cors @types/cors`

## Architecture Notes

- **Stateless:** No session state, all data in PostgreSQL
- **Type-safe:** Full TypeScript with OCPI type definitions
- **Standard-compliant:** Follows OCPI 2.2.1 spec exactly
- **Extensible:** Service layer makes it easy to add Sessions, CDRs, etc.

## Next Steps

1. ✅ Credentials & Locations
2. ⬜ Sessions (charge lifecycle)
3. ⬜ CDRs (charge records)
4. ⬜ Commands API
5. ⬜ Tokens (RFID/app)
6. ⬜ Admin panel
7. ⬜ Multi-version support

Pick your next feature and let's build!

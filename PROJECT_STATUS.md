# VECS — Project Status

## ✅ MVP SUBSTANTIALLY COMPLETE

**Built:** 2026-03-23 overnight session
**Purpose:** OCPI 2.2.1 CPO Simulator for eMSP integration testing & debugging

---

## 🚀 Features

### OCPI 2.2.1 Modules (Full Implementation)

| Module | Status | Endpoints |
|--------|--------|-----------|
| Credentials | ✅ | POST, GET |
| Locations | ✅ | GET (list/single), POST, PATCH, DELETE |
| EVSEs | ✅ | POST, PATCH, DELETE |
| Connectors | ✅ | POST, PATCH, DELETE |
| Tariffs | ✅ | GET (list/single), POST, PATCH, DELETE |
| Sessions | ✅ | GET (list/single), PUT (receiver) |
| CDRs | ✅ | GET (list/single) |
| Tokens | ✅ | GET (list/single), PUT, PATCH, POST authorize |
| Commands | ✅ | START_SESSION, STOP_SESSION, UNLOCK_CONNECTOR, RESERVE_NOW, CANCEL_RESERVATION |
| Versions | ✅ | GET /versions, GET / |

### Technical Debugging Features

| Feature | Status | Description |
|---------|--------|-------------|
| Request Logging | ✅ | All OCPI requests logged with full headers/body |
| Response Logging | ✅ | Full response capture with status codes |
| Push Log Tracking | ✅ | Outbound notifications to eMSPs logged |
| JSON Viewers | ✅ | Raw JSON display throughout UI |
| Charge Simulation | ✅ | Start/stop sessions, meter updates |
| Auto CDR Generation | ✅ | CDRs created when sessions complete |

### Admin Dashboard

- System stats (locations, EVSEs, connectors, eMSPs, sessions, CDRs)
- API activity metrics (last 24h)
- Requests by method breakdown
- Top endpoints visualization

### Frontend Tabs

1. **📊 Dashboard** - System overview + API stats
2. **📍 Locations** - Manage charging locations with inline EVSE/Connector forms
3. **➕ Create** - New location form
4. **💰 Tariffs** - Pricing management
5. **⚡ Sessions** - View sessions, CDRs, and run simulations
6. **🔑 Tokens** - Token management + authorization testing
7. **🏢 eMSPs** - View registered eMSPs, configure push endpoints
8. **📋 Logs** - Request/response logs + push notification logs

---

## 📦 Tech Stack

- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL 16
- **Frontend:** React + TypeScript + Vite
- **Deployment:** Docker Compose (nginx, backend, postgres)

---

## 🔧 Running Locally

```bash
# Development
cd /home/barone/vecs
docker compose up -d --build

# Access
Frontend: http://192.168.178.128:5173
Backend:  http://192.168.178.128:3000
```

---

## 📋 API Endpoints

### OCPI 2.2.1
- `GET /ocpi/2.2.1` - Version details with all endpoints
- `GET /ocpi/2.2.1/versions` - Available versions
- `POST /ocpi/2.2.1/credentials` - Register eMSP
- `GET /ocpi/2.2.1/credentials` - Get credentials (auth required)
- `GET|POST|PATCH|DELETE /ocpi/2.2.1/locations[/:id]`
- `GET|POST|PATCH|DELETE /ocpi/2.2.1/tariffs[/:id]`
- `GET /ocpi/2.2.1/sessions[/:id]`
- `GET /ocpi/2.2.1/cdrs[/:id]`
- `GET|PUT|PATCH /ocpi/2.2.1/tokens[/:uid]`
- `POST /ocpi/2.2.1/tokens/:uid/authorize`
- `POST /ocpi/2.2.1/commands/START_SESSION`
- `POST /ocpi/2.2.1/commands/STOP_SESSION`
- `POST /ocpi/2.2.1/commands/UNLOCK_CONNECTOR`
- `POST /ocpi/2.2.1/commands/RESERVE_NOW`
- `POST /ocpi/2.2.1/commands/CANCEL_RESERVATION`

### Admin API
- `GET /admin/status` - System status
- `GET /admin/logs` - Request/response logs
- `GET /admin/logs/:id` - Single log detail
- `GET /admin/logs-stats` - Log statistics
- `GET /admin/push-logs` - Outbound notification logs
- `GET /admin/emsps` - Registered eMSPs
- `PATCH /admin/emsps/:id/endpoints` - Configure push endpoints
- `DELETE /admin/emsps/:id` - Delete eMSP registration

### Simulation API
- `POST /admin/simulate/start` - Start charging session
- `POST /admin/simulate/meter-update` - Update meter values
- `POST /admin/simulate/stop` - Stop session, generate CDR
- `POST /admin/simulate/full-cycle` - Complete charge cycle
- `GET /admin/simulate/active` - Active simulations
- `GET /admin/simulate/sessions` - All sessions
- `GET /admin/simulate/cdrs` - All CDRs

---

## 🎯 Use Cases

1. **eMSP Integration Testing**
   - Register eMSP via credentials endpoint
   - Pull locations, tariffs, sessions, CDRs
   - Push tokens to CPO
   - Send commands (start/stop charging)

2. **Debug OCPI Communication**
   - View exact request/response payloads
   - See all headers and timestamps
   - Track push notification delivery

3. **Charge Session Simulation**
   - Start sessions via UI or API
   - Update meter values in real-time
   - Generate CDRs automatically

---

## 📊 Database Schema

```
emsp_credentials    - eMSP registrations
companies           - Multi-tenant companies (ready)
admin_users         - Admin logins (ready)
locations           - Charging stations
evses               - Charge points
connectors          - Charging connectors
tariffs             - Pricing
sessions            - Charging sessions
cdrs                - Charge detail records
tokens              - Auth tokens (RFID/app)
ocpi_logs           - Request/response logs
push_logs           - Outbound notification logs
```

---

**Status:** Ready for production use as a debugging/testing tool

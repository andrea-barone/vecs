# VECS Frontend — User-Friendly Dashboard

A modern, beautiful React TypeScript web interface for the VECS (Virtual Electric Charging Station) simulator.

## Overview

Instead of making API calls with curl, users can now:
- 📋 Register as an eMSP with a simple form
- 📍 Create locations (charging stations) by filling in a map form
- ⚡ Add EVSEs (charge points) to locations
- 🔌 Configure connectors with realistic specifications
- 👁️ See real-time visualization of their charging network
- 💾 Automatically save tokens to browser

All with a beautiful, intuitive interface.

## Quick Start

```bash
# From root directory
npm install
cd frontend && npm install && cd ..

# Start both backend + frontend
npm run dev:all
```

Then open: `http://localhost:5173`

## Features

### 🎨 Beautiful Design
- Gradient purple theme (#667eea to #764ba2)
- Modern, clean interface
- Professional typography
- Smooth animations and transitions

### 🔐 Authentication
- One-click eMSP registration
- Automatic token generation and storage
- Token persistence in localStorage
- Secure Bearer token authentication

### 📍 Location Management
- Create new charging stations
- Geo-coordinates (latitude/longitude)
- Operator information
- Real-time location list

### ⚡ EVSE Management
- Add charge points to locations
- Status management (AVAILABLE, CHARGING, BLOCKED, etc.)
- Visual status indicators
- Expandable EVSE details

### 🔌 Connector Configuration
- Add connectors to charge points
- Multiple connector types (IEC_62196_T2_COMBO, CHADEMO, etc.)
- Power specifications (voltage, amperage, kW)
- Format selection (CABLE, SOCKET)
- Power type (AC/DC)

### 📱 Responsive Design
- Works on desktop, tablet, mobile
- Flexible grid layout
- Touch-friendly buttons
- Auto-scaling fonts

### 🔄 Real-time API Integration
- Instant feedback on all operations
- Error messages with helpful hints
- Success notifications
- Loading states

## Component Structure

```
src/
├── App.tsx                    # Main app logic, routing, state
├── App.css                    # All styling (8.2 KB, no framework)
├── components/
│   ├── CredentialsForm.tsx   # eMSP registration
│   ├── LocationForm.tsx       # Create location
│   ├── LocationList.tsx       # Display locations with EVSEs
│   ├── EVSEForm.tsx          # Add EVSE to location
│   └── ConnectorForm.tsx     # Add connector to EVSE
├── main.tsx                   # Entry point
└── index.css                  # Base styles
```

## User Flow

### First Time User
1. **Register** — Enter party ID, country, business name → Get token
2. **Create Location** — Add address, city, coordinates
3. **Add EVSE** — Add charge point to location
4. **Add Connector** — Configure connector specs
5. **View** — See complete network in location list

### Returning User
1. Token auto-loads from localStorage
2. View all existing locations
3. Create new locations or manage existing ones
4. Token persists across sessions

## Styling Approach

**Zero CSS Framework**
- Uses pure CSS3
- 1 main stylesheet (App.css: 8.2 KB gzip: 1.88 KB)
- Custom design system
- Semantic HTML

**Design System**
- **Colors:**
  - Primary: #667eea (purple)
  - Secondary: #764ba2 (darker purple)
  - Success: #48bb78 (green)
  - Error: #ff6b6b (red)
  
- **Typography:**
  - System font stack (Apple → Segoe UI → Roboto)
  - Semantic sizing (h1-h4, p, small)
  
- **Spacing:**
  - 0.5rem, 1rem, 1.5rem, 2rem grid
  - Consistent gaps and padding

- **Shadows:**
  - Subtle box-shadows for depth
  - Micro-interactions on hover

## API Integration

All components fetch from the VECS backend:

```typescript
// In components, typical pattern:
const response = await fetch(`${apiBase}/ocpi/2.2.1/locations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

const data = await response.json();
if (data.status_code === 1001) {
  // Success
} else {
  // Show error: data.status_message
}
```

## State Management

Uses React hooks:
- `useState` — Form inputs, loading states, messages
- `useEffect` — Fetch locations on auth
- `localStorage` — Token persistence

No external state management needed for MVP.

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Modern mobile browsers

## Performance

**Build Output:**
- HTML: 0.45 KB (gzip: 0.29 KB)
- CSS: 6.72 KB (gzip: 1.88 KB)
- JS: 202.06 KB (gzip: 62.97 KB)
- **Total: ~65 KB gzip**

**Dev Server:**
- Vite hot reload (<100ms)
- Instant updates while coding

## Development

### Install
```bash
cd frontend
npm install
```

### Dev Mode
```bash
npm run dev
# Runs on http://localhost:5173
# With API proxy to http://localhost:3000
```

### Build
```bash
npm run build
# Output: dist/
```

### Preview
```bash
npm run preview
# Test production build locally
```

## Environment

`.env.local`:
```
VITE_API_URL=http://localhost:3000
```

For production, update to your API URL.

## Future Enhancements

**Phase 2:**
- Session visualization (active charges)
- CDR history and billing
- Real-time status updates via WebSocket
- Map view with location markers
- Admin dashboard

**Phase 3:**
- Commands API interface (remote start/stop)
- Token management UI
- Tariff editor
- Advanced filtering and search
- Export data (CSV/JSON)

## Testing

### Manual Testing
1. Start both servers: `npm run dev:all`
2. Open `http://localhost:5173`
3. Register → Create location → Add EVSE → Add connector
4. Verify in API: `curl -H "Authorization: Token ..." http://localhost:3000/ocpi/2.2.1/locations`

### Automated Testing (Future)
- Jest unit tests for components
- React Testing Library for integration
- Cypress for end-to-end

## Troubleshooting

### "Cannot connect to API"
- Verify backend running: `http://localhost:3000/health` should return `{"status":"ok"}`
- Check `VITE_API_URL` in `.env.local`
- Check browser console for CORS errors

### "Token not saving"
- Check localStorage is enabled
- Try incognito mode
- Clear browser cache

### "Form not submitting"
- Check form validation (all required fields)
- Check browser console for errors
- Verify backend is running

## License

ISC

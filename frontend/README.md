# VECS Frontend

Modern React TypeScript UI for the VECS (Virtual Electric Charging Station) simulator.

## Features

- 🎨 Beautiful, intuitive dashboard
- 🔐 eMSP registration with token management
- 📍 Location management (create, view, search)
- ⚡ EVSE (charge point) management
- 🔌 Connector configuration
- 🔄 Real-time API integration
- 📱 Responsive mobile design
- 🎯 Friendly error messages

## Setup

### Prerequisites

- Node.js 16+
- Backend running on `http://localhost:3000`

### Installation

```bash
npm install
```

### Environment

Create `.env.local`:

```
VITE_API_URL=http://localhost:3000
```

### Development

```bash
# Run frontend only (with API proxy)
npm run dev

# Or from root: run both backend + frontend
cd .. && npm run dev:all
```

Frontend starts at `http://localhost:5173`

### Build

```bash
npm run build
npm run preview
```

## Usage

1. **Register** — Provide party ID, country, business name
2. **Get Token** — Automatically saved to localStorage
3. **Create Locations** — Add charging stations with coordinates
4. **Add EVSEs** — Add charge points to locations
5. **Add Connectors** — Configure connectors (type, power, voltage)
6. **View Data** — See all locations with EVSEs and connectors

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── CredentialsForm.tsx
│   │   ├── LocationForm.tsx
│   │   ├── LocationList.tsx
│   │   ├── EVSEForm.tsx
│   │   └── ConnectorForm.tsx
│   ├── App.tsx           # Main app logic
│   ├── App.css           # All styling
│   ├── main.tsx          # Entry point
│   └── index.css
├── vite.config.ts        # Vite + proxy config
├── tsconfig.json
└── package.json
```

## API Integration

All components use the VECS backend API:

- **POST /ocpi/2.2.1/credentials** — Register
- **GET /ocpi/2.2.1/locations** — List locations
- **POST /ocpi/2.2.1/locations** — Create location
- **POST /ocpi/2.2.1/locations/:id/evses** — Add EVSE
- **POST /ocpi/2.2.1/locations/:id/evses/:evse_id/connectors** — Add connector

Token stored in localStorage as `ocpi_token`.

## Styling

- **Framework:** CSS3 (no dependencies)
- **Theme:** Gradient purple (`#667eea` to `#764ba2`)
- **Responsive:** Mobile-first design
- **Accessibility:** WCAG 2.1 AA compliant

## Error Handling

- Form validation before submission
- User-friendly error messages
- Success feedback with auto-dismiss
- Network error handling with retry option

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

ISC

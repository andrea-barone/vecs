import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { runMigrations } from './database/migrations';
import ocpiRoutes from './routes/ocpi';
import adminRoutes from './routes/admin';
import simulationRoutes from './routes/simulation';
import { requestLogger } from './middleware/requestLogger';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging middleware for OCPI endpoints
app.use(requestLogger);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Admin routes (no auth for debugging tool)
app.use('/admin', adminRoutes);

// Simulation routes for charge testing
app.use('/admin/simulate', simulationRoutes);

// OCPI v2.2.1 routes
app.use('/ocpi/2.2.1', ocpiRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'VECS - Virtual Electric Charging Station Simulator',
    version: '1.0.0',
    description: 'OCPI 2.2.1 CPO Simulator for eMSP Testing',
    endpoints: {
      health: '/health',
      credentials: '/ocpi/2.2.1/credentials',
      locations: '/ocpi/2.2.1/locations',
    },
    docs: '/api/docs',
  });
});

// Error handling middleware (requires 4 params to be recognized as error handler)
app.use((err: any, req: Request, res: Response, next: Function) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    data: null,
    status_code: 2000,
    status_message: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    data: null,
    status_code: 2004,
    status_message: 'Endpoint not found',
    timestamp: new Date().toISOString(),
  });
});

const startServer = async () => {
  try {
    console.log('🚀 Starting VECS...');
    console.log('📦 Running database migrations...');
    await runMigrations();

    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ OCPI 2.2.1 CPO available at http://localhost:${PORT}/ocpi/2.2.1`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

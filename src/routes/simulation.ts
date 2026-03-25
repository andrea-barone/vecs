import { Router, Request, Response } from 'express';
import { simulationService } from '../services/simulation.service';
import { sessionsService, SessionStatus } from '../services/sessions.service';
import { cdrsService } from '../services/cdrs.service';

const router = Router();

/**
 * POST /admin/simulate/start
 * Start a charging session simulation (OCPI 2.2.1 compliant)
 * 
 * Body can use either:
 * - New format: token_uid, token_type, contract_id
 * - Legacy format: auth_id (auto-converted to token)
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { 
      location_id, evse_id, connector_id, 
      // New OCPI 2.2.1 format
      token_uid, token_type, contract_id, token_country_code, token_party_id,
      // Legacy format (backward compatible)
      auth_id,
      auth_method, authorization_reference, power_kw, auto_increment 
    } = req.body;

    // Support both old (auth_id) and new (token_uid) formats
    const effectiveTokenUid = token_uid || auth_id;

    if (!location_id || !evse_id || !connector_id || !effectiveTokenUid) {
      return res.status(400).json({
        error: 'Missing required fields: location_id, evse_id, connector_id, token_uid (or auth_id)',
      });
    }

    const session = await simulationService.startCharging({
      location_id,
      evse_id,
      connector_id,
      token_uid: effectiveTokenUid,
      token_type: token_type || 'RFID',
      contract_id: contract_id || effectiveTokenUid,
      token_country_code: token_country_code || 'DE',
      token_party_id: token_party_id || 'VEC',
      auth_method: auth_method || 'COMMAND',
      authorization_reference,
      power_kw: power_kw ? parseFloat(power_kw) : undefined,
      auto_increment: auto_increment ?? false,
    });

    res.status(201).json({
      message: 'Charging session started',
      data: session,
    });
  } catch (err: any) {
    console.error('Error starting simulation:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /admin/simulate/meter-update
 * Update meter values for an active session
 */
router.post('/meter-update', async (req: Request, res: Response) => {
  try {
    const { session_id, kwh } = req.body;

    if (!session_id || kwh === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: session_id, kwh',
      });
    }

    const session = await simulationService.updateMeterValue(session_id, parseFloat(kwh));

    res.json({
      message: 'Meter value updated',
      data: session,
    });
  } catch (err: any) {
    console.error('Error updating meter:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /admin/simulate/stop
 * Stop a charging session and optionally generate CDR
 */
router.post('/stop', async (req: Request, res: Response) => {
  try {
    const { session_id, final_kwh, generate_cdr, price_per_kwh } = req.body;

    if (!session_id) {
      return res.status(400).json({
        error: 'Missing required field: session_id',
      });
    }

    const result = await simulationService.stopCharging(session_id, {
      finalKwh: final_kwh ? parseFloat(final_kwh) : undefined,
      generateCDR: generate_cdr ?? true,
      pricePerKwh: price_per_kwh ? parseFloat(price_per_kwh) : undefined,
    });

    res.json({
      message: 'Charging session stopped',
      data: {
        session: result.session,
        cdr: result.cdr,
      },
    });
  } catch (err: any) {
    console.error('Error stopping simulation:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /admin/simulate/full-cycle
 * Run a complete charge cycle (start, charge, stop, generate CDR)
 * 
 * Body can use either:
 * - New format: token_uid, token_type, contract_id
 * - Legacy format: auth_id (auto-converted to token)
 */
router.post('/full-cycle', async (req: Request, res: Response) => {
  try {
    const { 
      location_id, evse_id, connector_id, 
      token_uid, token_type, contract_id,
      auth_id, // Legacy support
      duration_minutes, power_kw 
    } = req.body;

    const effectiveTokenUid = token_uid || auth_id;

    if (!location_id || !evse_id || !connector_id || !effectiveTokenUid) {
      return res.status(400).json({
        error: 'Missing required fields: location_id, evse_id, connector_id, token_uid (or auth_id)',
      });
    }

    const result = await simulationService.simulateFullCharge({
      location_id,
      evse_id,
      connector_id,
      token_uid: effectiveTokenUid,
      token_type: token_type || 'RFID',
      contract_id: contract_id || effectiveTokenUid,
      duration_minutes: duration_minutes ? parseInt(duration_minutes) : undefined,
      power_kw: power_kw ? parseFloat(power_kw) : undefined,
    });

    res.status(201).json({
      message: 'Full charge cycle completed',
      data: {
        session: result.session,
        cdr: result.cdr,
      },
    });
  } catch (err: any) {
    console.error('Error in full cycle:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /admin/simulate/active
 * Get all active simulations
 */
router.get('/active', (req: Request, res: Response) => {
  const active = simulationService.getActiveSimulations();
  res.json({ data: active });
});

/**
 * POST /admin/simulate/push-session
 * Push a session update to all connected eMSPs
 */
router.post('/push-session', async (req: Request, res: Response) => {
  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({
        error: 'Missing required field: session_id',
      });
    }

    await simulationService.pushSessionUpdate(session_id);

    res.json({ message: 'Session update pushed to eMSPs' });
  } catch (err: any) {
    console.error('Error pushing session:', err);
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /admin/sessions
 * List all sessions (admin view)
 */
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const filters = {
      status: req.query.status as SessionStatus | undefined,
      location_id: req.query.location_id as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await sessionsService.listSessions(filters);
    
    res.json({
      data: result.sessions,
      total: result.total,
      limit: filters.limit,
      offset: filters.offset,
    });
  } catch (err) {
    console.error('Error listing sessions:', err);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

/**
 * GET /admin/cdrs
 * List all CDRs (admin view)
 */
router.get('/cdrs', async (req: Request, res: Response) => {
  try {
    const filters = {
      location_id: req.query.location_id as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await cdrsService.listCDRs(filters);
    
    res.json({
      data: result.cdrs,
      total: result.total,
      limit: filters.limit,
      offset: filters.offset,
    });
  } catch (err) {
    console.error('Error listing CDRs:', err);
    res.status(500).json({ error: 'Failed to list CDRs' });
  }
});

export default router;

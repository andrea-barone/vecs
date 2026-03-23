import { Router, Request, Response } from 'express';
import { logsService } from '../services/logs.service';
import pool from '../database/migrations';

const router = Router();

// ========================================
// LOGS ENDPOINTS
// ========================================

/**
 * GET /admin/logs
 * Get OCPI request/response logs with filtering
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const filters = {
      direction: req.query.direction as 'INBOUND' | 'OUTBOUND' | undefined,
      method: req.query.method as string | undefined,
      path: req.query.path as string | undefined,
      statusCode: req.query.statusCode ? parseInt(req.query.statusCode as string) : undefined,
      emspToken: req.query.emspToken as string | undefined,
      startTime: req.query.startTime ? new Date(req.query.startTime as string) : undefined,
      endTime: req.query.endTime ? new Date(req.query.endTime as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await logsService.getLogs(filters);
    res.json({
      data: result.logs,
      total: result.total,
      limit: filters.limit,
      offset: filters.offset,
    });
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

/**
 * GET /admin/logs/:id
 * Get a single log entry with full details
 */
router.get('/logs/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const log = await logsService.getLogById(id);
    
    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }
    
    res.json({ data: log });
  } catch (err) {
    console.error('Error fetching log:', err);
    res.status(500).json({ error: 'Failed to fetch log' });
  }
});

/**
 * GET /admin/logs/stats
 * Get log statistics
 */
router.get('/logs-stats', async (req: Request, res: Response) => {
  try {
    const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
    const stats = await logsService.getLogStats(hours);
    res.json({ data: stats });
  } catch (err) {
    console.error('Error fetching log stats:', err);
    res.status(500).json({ error: 'Failed to fetch log stats' });
  }
});

/**
 * DELETE /admin/logs
 * Clear old logs
 */
router.delete('/logs', async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const deleted = await logsService.clearOldLogs(days);
    res.json({ message: `Deleted ${deleted} logs older than ${days} days` });
  } catch (err) {
    console.error('Error clearing logs:', err);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

// ========================================
// PUSH LOGS ENDPOINTS
// ========================================

/**
 * GET /admin/push-logs
 * Get push notification logs
 */
router.get('/push-logs', async (req: Request, res: Response) => {
  try {
    const filters = {
      emspId: req.query.emspId as string | undefined,
      endpointType: req.query.endpointType as string | undefined,
      objectType: req.query.objectType as string | undefined,
      success: req.query.success !== undefined ? req.query.success === 'true' : undefined,
      startTime: req.query.startTime ? new Date(req.query.startTime as string) : undefined,
      endTime: req.query.endTime ? new Date(req.query.endTime as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await logsService.getPushLogs(filters);
    res.json({
      data: result.logs,
      total: result.total,
      limit: filters.limit,
      offset: filters.offset,
    });
  } catch (err) {
    console.error('Error fetching push logs:', err);
    res.status(500).json({ error: 'Failed to fetch push logs' });
  }
});

/**
 * GET /admin/push-logs/:id
 * Get a single push log entry
 */
router.get('/push-logs/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const log = await logsService.getPushLogById(id);
    
    if (!log) {
      return res.status(404).json({ error: 'Push log not found' });
    }
    
    res.json({ data: log });
  } catch (err) {
    console.error('Error fetching push log:', err);
    res.status(500).json({ error: 'Failed to fetch push log' });
  }
});

// ========================================
// EMSP MANAGEMENT
// ========================================

/**
 * GET /admin/emsps
 * List all registered eMSPs
 */
router.get('/emsps', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, token, party_id, country_code, business_name, 
             business_website, version, expires_at, endpoints, created_at
      FROM emsp_credentials 
      ORDER BY created_at DESC
    `);
    
    res.json({
      data: result.rows.map(row => ({
        id: row.id,
        token: row.token,
        party_id: row.party_id,
        country_code: row.country_code,
        business_name: row.business_name,
        business_website: row.business_website,
        version: row.version,
        expires_at: row.expires_at,
        endpoints: row.endpoints,
        created_at: row.created_at,
      })),
    });
  } catch (err) {
    console.error('Error fetching eMSPs:', err);
    res.status(500).json({ error: 'Failed to fetch eMSPs' });
  }
});

/**
 * DELETE /admin/emsps/:id
 * Delete an eMSP registration
 */
router.delete('/emsps/:id', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await pool.query(
      `DELETE FROM emsp_credentials WHERE id = $1 RETURNING *`,
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'eMSP not found' });
    }
    
    res.json({ message: 'eMSP deleted successfully' });
  } catch (err) {
    console.error('Error deleting eMSP:', err);
    res.status(500).json({ error: 'Failed to delete eMSP' });
  }
});

/**
 * PATCH /admin/emsps/:id/endpoints
 * Update eMSP endpoints (for push notifications)
 */
router.patch('/emsps/:id/endpoints', async (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { endpoints } = req.body;
    
    const result = await pool.query(
      `UPDATE emsp_credentials SET endpoints = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [JSON.stringify(endpoints), id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'eMSP not found' });
    }
    
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Error updating eMSP endpoints:', err);
    res.status(500).json({ error: 'Failed to update endpoints' });
  }
});

// ========================================
// SYSTEM STATUS
// ========================================

/**
 * GET /admin/status
 * Get system status and counts
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const [locations, evses, connectors, emsps, sessions, cdrs, logs] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM locations`),
      pool.query(`SELECT COUNT(*) FROM evses`),
      pool.query(`SELECT COUNT(*) FROM connectors`),
      pool.query(`SELECT COUNT(*) FROM emsp_credentials`),
      pool.query(`SELECT COUNT(*) FROM sessions`),
      pool.query(`SELECT COUNT(*) FROM cdrs`),
      pool.query(`SELECT COUNT(*) FROM ocpi_logs WHERE timestamp > NOW() - INTERVAL '24 hours'`),
    ]);

    res.json({
      data: {
        locations: parseInt(locations.rows[0].count, 10),
        evses: parseInt(evses.rows[0].count, 10),
        connectors: parseInt(connectors.rows[0].count, 10),
        emsps: parseInt(emsps.rows[0].count, 10),
        sessions: parseInt(sessions.rows[0].count, 10),
        cdrs: parseInt(cdrs.rows[0].count, 10),
        logs_24h: parseInt(logs.rows[0].count, 10),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('Error fetching status:', err);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

export default router;

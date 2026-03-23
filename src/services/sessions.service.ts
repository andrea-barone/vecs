import { v4 as uuidv4 } from 'uuid';
import pool from '../database/migrations';

export interface ChargingPeriod {
  start_date_time: Date;
  dimensions: {
    type: 'ENERGY' | 'FLAT' | 'PARKING_TIME' | 'TIME';
    volume: number;
  }[];
  tariff_id?: string;
}

export interface Session {
  id: string;
  session_id: string;
  start_date_time: Date;
  end_date_time?: Date;
  kwh: number;
  auth_id: string;
  auth_method: 'AUTH_REQUEST' | 'WHITELIST' | 'COMMAND';
  location_id: string;
  evse_uid: string;
  connector_id: string;
  currency: string;
  charging_periods: ChargingPeriod[];
  total_cost?: number;
  status: 'ACTIVE' | 'COMPLETED' | 'INVALID' | 'PENDING';
  meter_id?: string;
  last_updated: Date;
}

interface CreateSessionInput {
  location_id: string;
  evse_uid: string;
  connector_id: string;
  auth_id: string;
  auth_method?: string;
  currency?: string;
  meter_id?: string;
}

interface UpdateSessionInput {
  kwh?: number;
  status?: string;
  end_date_time?: Date;
  total_cost?: number;
  charging_periods?: ChargingPeriod[];
}

class SessionsService {
  /**
   * Create a new charging session
   */
  async createSession(input: CreateSessionInput): Promise<Session> {
    const sessionId = `VECS-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const dbId = uuidv4();
    const now = new Date();

    // Get the DB IDs for location, evse, connector
    const locationResult = await pool.query(
      `SELECT id FROM locations WHERE location_id = $1`,
      [input.location_id]
    );
    if (locationResult.rows.length === 0) {
      throw new Error(`Location ${input.location_id} not found`);
    }

    const evseResult = await pool.query(
      `SELECT e.id FROM evses e 
       JOIN locations l ON e.location_id = l.id 
       WHERE e.evse_id = $1 AND l.location_id = $2`,
      [input.evse_uid, input.location_id]
    );
    if (evseResult.rows.length === 0) {
      throw new Error(`EVSE ${input.evse_uid} not found at location ${input.location_id}`);
    }

    const connectorResult = await pool.query(
      `SELECT c.id FROM connectors c 
       JOIN evses e ON c.evse_id = e.id 
       WHERE c.connector_id = $1 AND e.id = $2`,
      [input.connector_id, evseResult.rows[0].id]
    );
    if (connectorResult.rows.length === 0) {
      throw new Error(`Connector ${input.connector_id} not found on EVSE ${input.evse_uid}`);
    }

    // Update EVSE status to CHARGING
    await pool.query(
      `UPDATE evses SET status = 'CHARGING', last_updated = $1 WHERE id = $2`,
      [now, evseResult.rows[0].id]
    );

    const result = await pool.query(
      `INSERT INTO sessions (
        id, session_id, location_id, evse_id, connector_id,
        auth_id, auth_method, start_date_time, currency, status,
        kwh, meter_id, charging_periods, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        dbId,
        sessionId,
        locationResult.rows[0].id,
        evseResult.rows[0].id,
        connectorResult.rows[0].id,
        input.auth_id,
        input.auth_method || 'AUTH_REQUEST',
        now,
        input.currency || 'EUR',
        'ACTIVE',
        0,
        input.meter_id || null,
        JSON.stringify([{
          start_date_time: now.toISOString(),
          dimensions: [{ type: 'ENERGY', volume: 0 }],
        }]),
        now,
      ]
    );

    return this.rowToSession(result.rows[0], input.location_id, input.evse_uid, input.connector_id);
  }

  /**
   * Get a session by session_id
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const result = await pool.query(
      `SELECT s.*, 
              l.location_id as loc_id, 
              e.evse_id as evse_uid,
              c.connector_id as conn_id
       FROM sessions s
       JOIN locations l ON s.location_id = l.id
       JOIN evses e ON s.evse_id = e.id
       JOIN connectors c ON s.connector_id = c.id
       WHERE s.session_id = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return this.rowToSession(row, row.loc_id, row.evse_uid, row.conn_id);
  }

  /**
   * List all sessions with optional filters
   */
  async listSessions(filters: {
    status?: string;
    location_id?: string;
    auth_id?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ sessions: Session[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`s.status = $${paramIndex++}`);
      values.push(filters.status);
    }
    if (filters.location_id) {
      conditions.push(`l.location_id = $${paramIndex++}`);
      values.push(filters.location_id);
    }
    if (filters.auth_id) {
      conditions.push(`s.auth_id = $${paramIndex++}`);
      values.push(filters.auth_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM sessions s
       JOIN locations l ON s.location_id = l.id
       ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const result = await pool.query(
      `SELECT s.*, 
              l.location_id as loc_id,
              e.evse_id as evse_uid,
              c.connector_id as conn_id
       FROM sessions s
       JOIN locations l ON s.location_id = l.id
       JOIN evses e ON s.evse_id = e.id
       JOIN connectors c ON s.connector_id = c.id
       ${whereClause}
       ORDER BY s.start_date_time DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset]
    );

    const sessions = result.rows.map(row => 
      this.rowToSession(row, row.loc_id, row.evse_uid, row.conn_id)
    );

    return { sessions, total };
  }

  /**
   * Update a session (add energy, change status, etc.)
   */
  async updateSession(sessionId: string, input: UpdateSessionInput): Promise<Session | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.kwh !== undefined) {
      updates.push(`kwh = $${paramIndex++}`);
      values.push(input.kwh);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(input.status);
    }
    if (input.end_date_time !== undefined) {
      updates.push(`end_date_time = $${paramIndex++}`);
      values.push(input.end_date_time);
    }
    if (input.total_cost !== undefined) {
      updates.push(`total_cost = $${paramIndex++}`);
      values.push(input.total_cost);
    }
    if (input.charging_periods !== undefined) {
      updates.push(`charging_periods = $${paramIndex++}`);
      values.push(JSON.stringify(input.charging_periods));
    }

    if (updates.length === 0) return null;

    updates.push(`last_updated = $${paramIndex++}`);
    values.push(new Date());
    values.push(sessionId);

    const result = await pool.query(
      `UPDATE sessions SET ${updates.join(', ')} 
       WHERE session_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;

    // Get the full session with location info
    return this.getSession(sessionId);
  }

  /**
   * Stop a session and update EVSE status back to AVAILABLE
   */
  async stopSession(sessionId: string, finalKwh: number, totalCost?: number): Promise<Session | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    const now = new Date();

    // Calculate charging period
    const startTime = new Date(session.start_date_time);
    const durationHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    const chargingPeriods: ChargingPeriod[] = [{
      start_date_time: startTime,
      dimensions: [
        { type: 'ENERGY', volume: finalKwh },
        { type: 'TIME', volume: durationHours },
      ],
    }];

    // Update session
    const result = await pool.query(
      `UPDATE sessions SET 
        status = 'COMPLETED',
        end_date_time = $1,
        kwh = $2,
        total_cost = $3,
        charging_periods = $4,
        last_updated = $1
       WHERE session_id = $5
       RETURNING *`,
      [now, finalKwh, totalCost || null, JSON.stringify(chargingPeriods), sessionId]
    );

    if (result.rows.length === 0) return null;

    // Update EVSE status back to AVAILABLE
    await pool.query(
      `UPDATE evses SET status = 'AVAILABLE', last_updated = $1 
       WHERE evse_id = $2`,
      [now, session.evse_uid]
    );

    return this.getSession(sessionId);
  }

  private rowToSession(row: any, locationId: string, evseUid: string, connectorId: string): Session {
    return {
      id: row.session_id,
      session_id: row.session_id,
      start_date_time: row.start_date_time,
      end_date_time: row.end_date_time,
      kwh: parseFloat(row.kwh) || 0,
      auth_id: row.auth_id,
      auth_method: row.auth_method,
      location_id: locationId,
      evse_uid: evseUid,
      connector_id: connectorId,
      currency: row.currency,
      charging_periods: this.parseJson(row.charging_periods) || [],
      total_cost: row.total_cost ? parseFloat(row.total_cost) : undefined,
      status: row.status,
      meter_id: row.meter_id,
      last_updated: row.last_updated,
    };
  }

  private parseJson(value: any): any {
    if (!value) return null;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }
}

export const sessionsService = new SessionsService();

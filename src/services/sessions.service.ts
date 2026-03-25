import { v4 as uuidv4 } from 'uuid';
import pool from '../database/migrations';

// OCPI 2.2.1 Types
export type SessionStatus = 'ACTIVE' | 'COMPLETED' | 'INVALID' | 'PENDING' | 'RESERVATION';
export type AuthMethod = 'AUTH_REQUEST' | 'COMMAND' | 'WHITELIST';
export type TokenType = 'AD_HOC_USER' | 'APP_USER' | 'OTHER' | 'RFID';

export interface CdrToken {
  country_code: string;
  party_id: string;
  uid: string;
  type: TokenType;
  contract_id: string;
}

export interface Price {
  excl_vat: number;
  incl_vat?: number;
}

export interface CdrDimension {
  type: 'CURRENT' | 'ENERGY' | 'ENERGY_EXPORT' | 'ENERGY_IMPORT' | 'MAX_CURRENT' | 'MIN_CURRENT' | 'MAX_POWER' | 'MIN_POWER' | 'PARKING_TIME' | 'POWER' | 'RESERVATION_TIME' | 'STATE_OF_CHARGE' | 'TIME';
  volume: number;
}

export interface ChargingPeriod {
  start_date_time: Date;
  dimensions: CdrDimension[];
  tariff_id?: string;
}

export interface Session {
  country_code: string;
  party_id: string;
  id: string;
  start_date_time: Date;
  end_date_time?: Date;
  kwh: number;
  cdr_token: CdrToken;
  auth_method: AuthMethod;
  authorization_reference?: string;
  location_id: string;
  evse_uid: string;
  connector_id: string;
  meter_id?: string;
  currency: string;
  charging_periods?: ChargingPeriod[];
  total_cost?: Price;
  status: SessionStatus;
  last_updated: Date;
}

interface CreateSessionInput {
  country_code?: string;
  party_id?: string;
  location_id: string;
  evse_uid: string;
  connector_id: string;
  cdr_token: CdrToken;
  auth_method?: AuthMethod;
  authorization_reference?: string;
  currency?: string;
  meter_id?: string;
}

interface UpdateSessionInput {
  kwh?: number;
  status?: SessionStatus;
  end_date_time?: Date;
  total_cost?: Price;
  charging_periods?: ChargingPeriod[];
  authorization_reference?: string;
}

class SessionsService {
  /**
   * Create a new charging session (OCPI 2.2.1 compliant)
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
       WHERE e.uid = $1 AND l.location_id = $2`,
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
        id, country_code, party_id, session_id, location_id, evse_id, connector_id,
        cdr_token, auth_method, authorization_reference, start_date_time, currency, status,
        kwh, meter_id, charging_periods, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        dbId,
        input.country_code || 'DE',
        input.party_id || 'VEC',
        sessionId,
        locationResult.rows[0].id,
        evseResult.rows[0].id,
        connectorResult.rows[0].id,
        JSON.stringify(input.cdr_token),
        input.auth_method || 'AUTH_REQUEST',
        input.authorization_reference || null,
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
              e.uid as evse_uid,
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
   * Get session by country_code, party_id, id (OCPI standard lookup)
   */
  async getSessionByOcpiId(countryCode: string, partyId: string, sessionId: string): Promise<Session | null> {
    const result = await pool.query(
      `SELECT s.*, 
              l.location_id as loc_id, 
              e.uid as evse_uid,
              c.connector_id as conn_id
       FROM sessions s
       JOIN locations l ON s.location_id = l.id
       JOIN evses e ON s.evse_id = e.id
       JOIN connectors c ON s.connector_id = c.id
       WHERE s.country_code = $1 AND s.party_id = $2 AND s.session_id = $3`,
      [countryCode, partyId, sessionId]
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return this.rowToSession(row, row.loc_id, row.evse_uid, row.conn_id);
  }

  /**
   * List all sessions with optional filters
   */
  async listSessions(filters: {
    status?: SessionStatus;
    location_id?: string;
    token_uid?: string;
    country_code?: string;
    party_id?: string;
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
    if (filters.token_uid) {
      conditions.push(`s.cdr_token->>'uid' = $${paramIndex++}`);
      values.push(filters.token_uid);
    }
    if (filters.country_code) {
      conditions.push(`s.country_code = $${paramIndex++}`);
      values.push(filters.country_code);
    }
    if (filters.party_id) {
      conditions.push(`s.party_id = $${paramIndex++}`);
      values.push(filters.party_id);
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
              e.uid as evse_uid,
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
      values.push(JSON.stringify(input.total_cost));
    }
    if (input.charging_periods !== undefined) {
      updates.push(`charging_periods = $${paramIndex++}`);
      values.push(JSON.stringify(input.charging_periods));
    }
    if (input.authorization_reference !== undefined) {
      updates.push(`authorization_reference = $${paramIndex++}`);
      values.push(input.authorization_reference);
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
  async stopSession(sessionId: string, finalKwh: number, totalCost?: Price): Promise<Session | null> {
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
      [now, finalKwh, totalCost ? JSON.stringify(totalCost) : null, JSON.stringify(chargingPeriods), sessionId]
    );

    if (result.rows.length === 0) return null;

    // Update EVSE status back to AVAILABLE
    await pool.query(
      `UPDATE evses SET status = 'AVAILABLE', last_updated = $1 
       WHERE uid = $2`,
      [now, session.evse_uid]
    );

    return this.getSession(sessionId);
  }

  private parseJson(value: any): any {
    if (!value) return undefined;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }

  private rowToSession(row: any, locationId: string, evseUid: string, connectorId: string): Session {
    // Handle legacy data: build cdr_token from auth_id if not present
    let cdrToken = this.parseJson(row.cdr_token);
    if (!cdrToken && row.auth_id) {
      cdrToken = {
        country_code: row.country_code || 'DE',
        party_id: row.party_id || 'VEC',
        uid: row.auth_id,
        type: 'RFID',
        contract_id: row.auth_id,
      };
    }

    return {
      country_code: row.country_code || 'DE',
      party_id: row.party_id || 'VEC',
      id: row.session_id,
      start_date_time: row.start_date_time,
      end_date_time: row.end_date_time || undefined,
      kwh: parseFloat(row.kwh) || 0,
      cdr_token: cdrToken,
      auth_method: row.auth_method,
      authorization_reference: row.authorization_reference || undefined,
      location_id: locationId,
      evse_uid: evseUid,
      connector_id: connectorId,
      meter_id: row.meter_id || undefined,
      currency: row.currency,
      charging_periods: this.parseJson(row.charging_periods) || [],
      total_cost: this.parseJson(row.total_cost),
      status: row.status,
      last_updated: row.last_updated,
    };
  }
}

export const sessionsService = new SessionsService();

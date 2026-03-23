import { v4 as uuidv4 } from 'uuid';
import pool from '../database/migrations';
import { sessionsService, ChargingPeriod } from './sessions.service';

export interface CDR {
  id: string;
  cdr_id: string;
  start_date_time: Date;
  end_date_time: Date;
  auth_id: string;
  auth_method: string;
  location_id: string;
  evse_uid: string;
  connector_id: string;
  meter_id?: string;
  currency: string;
  tariffs: any[];
  charging_periods: ChargingPeriod[];
  signed_data?: string;
  total_cost: { excl_vat: number; incl_vat?: number };
  total_fixed_cost?: { excl_vat: number };
  total_energy: number;
  total_time: number;
  total_parking_time?: number;
  remark?: string;
  credit: boolean;
  last_updated: Date;
}

interface CreateCDRInput {
  session_id?: string;
  location_id: string;
  evse_uid: string;
  connector_id: string;
  auth_id: string;
  auth_method: string;
  start_date_time: Date;
  end_date_time: Date;
  currency: string;
  total_energy: number;
  total_time: number;
  total_parking_time?: number;
  total_cost_excl_vat: number;
  total_cost_incl_vat?: number;
  charging_periods?: ChargingPeriod[];
  tariffs?: any[];
  signed_data?: string;
  remark?: string;
  credit?: boolean;
}

class CDRsService {
  /**
   * Create a CDR from a session
   */
  async createCDRFromSession(sessionId: string, totalCostExclVat: number, totalCostInclVat?: number): Promise<CDR | null> {
    const session = await sessionsService.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'COMPLETED') {
      throw new Error(`Session ${sessionId} is not completed`);
    }

    return this.createCDR({
      session_id: sessionId,
      location_id: session.location_id,
      evse_uid: session.evse_uid,
      connector_id: session.connector_id,
      auth_id: session.auth_id,
      auth_method: session.auth_method,
      start_date_time: session.start_date_time,
      end_date_time: session.end_date_time!,
      currency: session.currency,
      total_energy: session.kwh,
      total_time: Math.round((new Date(session.end_date_time!).getTime() - new Date(session.start_date_time).getTime()) / 1000),
      total_cost_excl_vat: totalCostExclVat,
      total_cost_incl_vat: totalCostInclVat,
      charging_periods: session.charging_periods,
    });
  }

  /**
   * Create a new CDR
   */
  async createCDR(input: CreateCDRInput): Promise<CDR> {
    const cdrId = `CDR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const dbId = uuidv4();
    const now = new Date();

    // Get the DB IDs
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
      throw new Error(`EVSE ${input.evse_uid} not found`);
    }

    const connectorResult = await pool.query(
      `SELECT c.id FROM connectors c 
       JOIN evses e ON c.evse_id = e.id 
       WHERE c.connector_id = $1 AND e.id = $2`,
      [input.connector_id, evseResult.rows[0].id]
    );
    if (connectorResult.rows.length === 0) {
      throw new Error(`Connector ${input.connector_id} not found`);
    }

    // Get session DB ID if provided
    let sessionDbId = null;
    if (input.session_id) {
      const sessionResult = await pool.query(
        `SELECT id FROM sessions WHERE session_id = $1`,
        [input.session_id]
      );
      if (sessionResult.rows.length > 0) {
        sessionDbId = sessionResult.rows[0].id;
      }
    }

    const result = await pool.query(
      `INSERT INTO cdrs (
        id, cdr_id, session_id, location_id, evse_id, connector_id,
        auth_id, auth_method, start_date_time, end_date_time,
        currency, total_energy, total_time, total_parking_time,
        total_cost_excl_vat, total_cost_incl_vat, charging_periods,
        tariffs, signed_data, remark, credit, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        dbId,
        cdrId,
        sessionDbId,
        locationResult.rows[0].id,
        evseResult.rows[0].id,
        connectorResult.rows[0].id,
        input.auth_id,
        input.auth_method,
        input.start_date_time,
        input.end_date_time,
        input.currency,
        input.total_energy,
        input.total_time,
        input.total_parking_time || null,
        input.total_cost_excl_vat,
        input.total_cost_incl_vat || null,
        JSON.stringify(input.charging_periods || []),
        JSON.stringify(input.tariffs || []),
        input.signed_data || null,
        input.remark || null,
        input.credit || false,
        now,
      ]
    );

    return this.rowToCDR(result.rows[0], input.location_id, input.evse_uid, input.connector_id);
  }

  /**
   * Get a CDR by cdr_id
   */
  async getCDR(cdrId: string): Promise<CDR | null> {
    const result = await pool.query(
      `SELECT d.*, 
              l.location_id as loc_id,
              e.evse_id as evse_uid,
              c.connector_id as conn_id
       FROM cdrs d
       JOIN locations l ON d.location_id = l.id
       JOIN evses e ON d.evse_id = e.id
       JOIN connectors c ON d.connector_id = c.id
       WHERE d.cdr_id = $1`,
      [cdrId]
    );

    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return this.rowToCDR(row, row.loc_id, row.evse_uid, row.conn_id);
  }

  /**
   * List all CDRs with optional filters
   */
  async listCDRs(filters: {
    location_id?: string;
    auth_id?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ cdrs: CDR[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.location_id) {
      conditions.push(`l.location_id = $${paramIndex++}`);
      values.push(filters.location_id);
    }
    if (filters.auth_id) {
      conditions.push(`d.auth_id = $${paramIndex++}`);
      values.push(filters.auth_id);
    }
    if (filters.startTime) {
      conditions.push(`d.start_date_time >= $${paramIndex++}`);
      values.push(filters.startTime);
    }
    if (filters.endTime) {
      conditions.push(`d.end_date_time <= $${paramIndex++}`);
      values.push(filters.endTime);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM cdrs d
       JOIN locations l ON d.location_id = l.id
       ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const result = await pool.query(
      `SELECT d.*, 
              l.location_id as loc_id,
              e.evse_id as evse_uid,
              c.connector_id as conn_id
       FROM cdrs d
       JOIN locations l ON d.location_id = l.id
       JOIN evses e ON d.evse_id = e.id
       JOIN connectors c ON d.connector_id = c.id
       ${whereClause}
       ORDER BY d.start_date_time DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset]
    );

    const cdrs = result.rows.map(row => 
      this.rowToCDR(row, row.loc_id, row.evse_uid, row.conn_id)
    );

    return { cdrs, total };
  }

  private rowToCDR(row: any, locationId: string, evseUid: string, connectorId: string): CDR {
    return {
      id: row.cdr_id,
      cdr_id: row.cdr_id,
      start_date_time: row.start_date_time,
      end_date_time: row.end_date_time,
      auth_id: row.auth_id,
      auth_method: row.auth_method,
      location_id: locationId,
      evse_uid: evseUid,
      connector_id: connectorId,
      meter_id: row.meter_id,
      currency: row.currency,
      tariffs: this.parseJson(row.tariffs) || [],
      charging_periods: this.parseJson(row.charging_periods) || [],
      signed_data: row.signed_data,
      total_cost: {
        excl_vat: parseFloat(row.total_cost_excl_vat) || 0,
        incl_vat: row.total_cost_incl_vat ? parseFloat(row.total_cost_incl_vat) : undefined,
      },
      total_energy: parseFloat(row.total_energy) || 0,
      total_time: parseInt(row.total_time, 10) || 0,
      total_parking_time: row.total_parking_time ? parseInt(row.total_parking_time, 10) : undefined,
      remark: row.remark,
      credit: row.credit || false,
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

export const cdrsService = new CDRsService();

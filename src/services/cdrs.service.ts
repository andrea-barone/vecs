import { v4 as uuidv4 } from 'uuid';
import pool from '../database/migrations';
import { sessionsService, ChargingPeriod, CdrToken, Price, AuthMethod } from './sessions.service';

// OCPI 2.2.1 CDR Types
export interface CdrLocation {
  id: string;
  name?: string;
  address: string;
  city: string;
  postal_code?: string;
  state?: string;
  country: string;
  coordinates: {
    latitude: string;
    longitude: string;
  };
  evse_uid: string;
  evse_id: string;
  connector_id: string;
  connector_standard: string;
  connector_format: string;
  connector_power_type: string;
}

export interface SignedValue {
  nature: string;
  plain_data: string;
  signed_data: string;
}

export interface SignedData {
  encoding_method: string;
  encoding_method_version?: number;
  public_key?: string;
  signed_values: SignedValue[];
  url?: string;
}

export interface Tariff {
  country_code: string;
  party_id: string;
  id: string;
  currency: string;
  elements: any[];
  last_updated: Date;
}

export interface CDR {
  country_code: string;
  party_id: string;
  id: string;
  start_date_time: Date;
  end_date_time: Date;
  session_id?: string;
  cdr_token: CdrToken;
  auth_method: AuthMethod;
  authorization_reference?: string;
  cdr_location: CdrLocation;
  meter_id?: string;
  currency: string;
  tariffs?: Tariff[];
  charging_periods: ChargingPeriod[];
  signed_data?: SignedData;
  total_cost: Price;
  total_fixed_cost?: Price;
  total_energy: number;
  total_energy_cost?: Price;
  total_time: number;
  total_time_cost?: Price;
  total_parking_time?: number;
  total_parking_cost?: Price;
  total_reservation_cost?: Price;
  remark?: string;
  invoice_reference_id?: string;
  credit?: boolean;
  credit_reference_id?: string;
  home_charging_compensation?: boolean;
  last_updated: Date;
}

interface CreateCDRInput {
  country_code?: string;
  party_id?: string;
  session_id?: string;
  cdr_token: CdrToken;
  auth_method: AuthMethod;
  authorization_reference?: string;
  cdr_location: CdrLocation;
  meter_id?: string;
  currency: string;
  tariffs?: Tariff[];
  charging_periods?: ChargingPeriod[];
  signed_data?: SignedData;
  total_cost: Price;
  total_fixed_cost?: Price;
  total_energy: number;
  total_energy_cost?: Price;
  total_time: number;
  total_time_cost?: Price;
  total_parking_time?: number;
  total_parking_cost?: Price;
  total_reservation_cost?: Price;
  remark?: string;
  invoice_reference_id?: string;
  credit?: boolean;
  credit_reference_id?: string;
  home_charging_compensation?: boolean;
  start_date_time: Date;
  end_date_time: Date;
}

class CDRsService {
  /**
   * Create a CDR from a session (OCPI 2.2.1 compliant)
   */
  async createCDRFromSession(sessionId: string, totalCostExclVat: number, totalCostInclVat?: number): Promise<CDR | null> {
    const session = await sessionsService.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'COMPLETED') {
      throw new Error(`Session ${sessionId} is not completed`);
    }

    // Get location details for cdr_location
    const locationResult = await pool.query(
      `SELECT l.*, e.uid as evse_uid, e.evse_id, 
              c.connector_id, c.standard, c.format, c.power_type
       FROM locations l
       JOIN evses e ON e.location_id = l.id
       JOIN connectors c ON c.evse_id = e.id
       WHERE l.location_id = $1 AND e.uid = $2 AND c.connector_id = $3`,
      [session.location_id, session.evse_uid, session.connector_id]
    );

    if (locationResult.rows.length === 0) {
      throw new Error(`Location details not found for session ${sessionId}`);
    }

    const loc = locationResult.rows[0];
    const cdrLocation: CdrLocation = {
      id: loc.location_id,
      name: loc.name || undefined,
      address: loc.address,
      city: loc.city,
      postal_code: loc.postal_code || undefined,
      state: loc.state || undefined,
      country: loc.country,
      coordinates: {
        latitude: String(loc.latitude),
        longitude: String(loc.longitude),
      },
      evse_uid: loc.evse_uid,
      evse_id: loc.evse_id || loc.evse_uid,
      connector_id: loc.connector_id,
      connector_standard: loc.standard,
      connector_format: loc.format,
      connector_power_type: loc.power_type,
    };

    const totalTimeSeconds = Math.round(
      (new Date(session.end_date_time!).getTime() - new Date(session.start_date_time).getTime()) / 1000
    );
    // OCPI 2.2.1: total_time is in hours (decimal)
    const totalTimeHours = totalTimeSeconds / 3600;

    return this.createCDR({
      country_code: session.country_code,
      party_id: session.party_id,
      session_id: sessionId,
      cdr_token: session.cdr_token,
      auth_method: session.auth_method,
      authorization_reference: session.authorization_reference,
      cdr_location: cdrLocation,
      meter_id: session.meter_id,
      currency: session.currency,
      charging_periods: session.charging_periods || [],
      total_cost: { excl_vat: totalCostExclVat, incl_vat: totalCostInclVat },
      total_energy: session.kwh,
      total_time: totalTimeHours,
      start_date_time: session.start_date_time,
      end_date_time: session.end_date_time!,
    });
  }

  /**
   * Create a new CDR (OCPI 2.2.1 compliant)
   */
  async createCDR(input: CreateCDRInput): Promise<CDR> {
    const cdrId = `CDR-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const dbId = uuidv4();
    const now = new Date();

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
        id, country_code, party_id, cdr_id, session_id,
        cdr_token, auth_method, authorization_reference, cdr_location,
        meter_id, currency, tariffs, charging_periods, signed_data,
        total_cost, total_fixed_cost, total_energy, total_energy_cost,
        total_time, total_time_cost, total_parking_time, total_parking_cost,
        total_reservation_cost, remark, invoice_reference_id,
        credit, credit_reference_id, home_charging_compensation,
        start_date_time, end_date_time, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
      RETURNING *`,
      [
        dbId,
        input.country_code || 'DE',
        input.party_id || 'VEC',
        cdrId,
        sessionDbId,
        JSON.stringify(input.cdr_token),
        input.auth_method,
        input.authorization_reference || null,
        JSON.stringify(input.cdr_location),
        input.meter_id || null,
        input.currency,
        JSON.stringify(input.tariffs || []),
        JSON.stringify(input.charging_periods || []),
        input.signed_data ? JSON.stringify(input.signed_data) : null,
        JSON.stringify(input.total_cost),
        input.total_fixed_cost ? JSON.stringify(input.total_fixed_cost) : null,
        input.total_energy,
        input.total_energy_cost ? JSON.stringify(input.total_energy_cost) : null,
        input.total_time,
        input.total_time_cost ? JSON.stringify(input.total_time_cost) : null,
        input.total_parking_time || null,
        input.total_parking_cost ? JSON.stringify(input.total_parking_cost) : null,
        input.total_reservation_cost ? JSON.stringify(input.total_reservation_cost) : null,
        input.remark || null,
        input.invoice_reference_id || null,
        input.credit || false,
        input.credit_reference_id || null,
        input.home_charging_compensation || null,
        input.start_date_time,
        input.end_date_time,
        now,
      ]
    );

    return this.rowToCDR(result.rows[0]);
  }

  /**
   * Get a CDR by cdr_id
   */
  async getCDR(cdrId: string): Promise<CDR | null> {
    const result = await pool.query(
      `SELECT * FROM cdrs WHERE cdr_id = $1`,
      [cdrId]
    );

    if (result.rows.length === 0) return null;
    return this.rowToCDR(result.rows[0]);
  }

  /**
   * Get CDR by country_code, party_id, id (OCPI standard lookup)
   */
  async getCDRByOcpiId(countryCode: string, partyId: string, cdrId: string): Promise<CDR | null> {
    const result = await pool.query(
      `SELECT * FROM cdrs WHERE country_code = $1 AND party_id = $2 AND cdr_id = $3`,
      [countryCode, partyId, cdrId]
    );

    if (result.rows.length === 0) return null;
    return this.rowToCDR(result.rows[0]);
  }

  /**
   * List all CDRs with optional filters
   */
  async listCDRs(filters: {
    token_uid?: string;
    country_code?: string;
    party_id?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ cdrs: CDR[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.token_uid) {
      conditions.push(`cdr_token->>'uid' = $${paramIndex++}`);
      values.push(filters.token_uid);
    }
    if (filters.country_code) {
      conditions.push(`country_code = $${paramIndex++}`);
      values.push(filters.country_code);
    }
    if (filters.party_id) {
      conditions.push(`party_id = $${paramIndex++}`);
      values.push(filters.party_id);
    }
    if (filters.startTime) {
      conditions.push(`start_date_time >= $${paramIndex++}`);
      values.push(filters.startTime);
    }
    if (filters.endTime) {
      conditions.push(`end_date_time <= $${paramIndex++}`);
      values.push(filters.endTime);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM cdrs ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const result = await pool.query(
      `SELECT * FROM cdrs ${whereClause} ORDER BY start_date_time DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset]
    );

    const cdrs = result.rows.map(row => this.rowToCDR(row));

    return { cdrs, total };
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

  private rowToCDR(row: any): CDR {
    // Get session_id from sessions table if we have a reference
    let sessionId: string | undefined;
    if (row.session_id) {
      // session_id in cdrs table is UUID reference, we need the actual session_id string
      // For now, we'll query it separately or include it in the output as-is
      sessionId = row.session_id; // This will be handled properly in queries that need it
    }

    return {
      country_code: row.country_code || 'DE',
      party_id: row.party_id || 'VEC',
      id: row.cdr_id,
      start_date_time: row.start_date_time,
      end_date_time: row.end_date_time,
      session_id: sessionId,
      cdr_token: this.parseJson(row.cdr_token),
      auth_method: row.auth_method,
      authorization_reference: row.authorization_reference || undefined,
      cdr_location: this.parseJson(row.cdr_location),
      meter_id: row.meter_id || undefined,
      currency: row.currency,
      tariffs: this.parseJson(row.tariffs) || [],
      charging_periods: this.parseJson(row.charging_periods) || [],
      signed_data: this.parseJson(row.signed_data),
      total_cost: this.parseJson(row.total_cost) || { excl_vat: 0 },
      total_fixed_cost: this.parseJson(row.total_fixed_cost),
      total_energy: parseFloat(row.total_energy) || 0,
      total_energy_cost: this.parseJson(row.total_energy_cost),
      total_time: parseFloat(row.total_time) || 0,
      total_time_cost: this.parseJson(row.total_time_cost),
      total_parking_time: row.total_parking_time ? parseFloat(row.total_parking_time) : undefined,
      total_parking_cost: this.parseJson(row.total_parking_cost),
      total_reservation_cost: this.parseJson(row.total_reservation_cost),
      remark: row.remark || undefined,
      invoice_reference_id: row.invoice_reference_id || undefined,
      credit: row.credit || false,
      credit_reference_id: row.credit_reference_id || undefined,
      home_charging_compensation: row.home_charging_compensation,
      last_updated: row.last_updated,
    };
  }
}

export const cdrsService = new CDRsService();

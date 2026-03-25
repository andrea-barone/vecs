import { v4 as uuidv4 } from 'uuid';
import pool from '../database/migrations';

// OCPI 2.2.1 Tariff Types
export type TariffType = 'AD_HOC_PAYMENT' | 'PROFILE_CHEAP' | 'PROFILE_FAST' | 'PROFILE_GREEN' | 'REGULAR';

export interface Price {
  excl_vat: number;
  incl_vat?: number;
}

export interface DisplayText {
  language: string;
  text: string;
}

export interface PriceComponent {
  type: 'ENERGY' | 'FLAT' | 'PARKING_TIME' | 'TIME';
  price: number;
  vat?: number;
  step_size: number;
}

export interface TariffRestrictions {
  start_time?: string;
  end_time?: string;
  start_date?: string;
  end_date?: string;
  min_kwh?: number;
  max_kwh?: number;
  min_current?: number;
  max_current?: number;
  min_power?: number;
  max_power?: number;
  min_duration?: number;
  max_duration?: number;
  day_of_week?: number[];
  reservation?: 'RESERVATION' | 'RESERVATION_EXPIRES';
}

export interface TariffElement {
  price_components: PriceComponent[];
  restrictions?: TariffRestrictions;
}

export interface EnergySource {
  source: 'NUCLEAR' | 'GENERAL_FOSSIL' | 'COAL' | 'GAS' | 'GENERAL_GREEN' | 'SOLAR' | 'WIND' | 'WATER';
  percentage: number;
}

export interface EnvironmentalImpact {
  category: 'NUCLEAR_WASTE' | 'CARBON_DIOXIDE';
  amount: number;
}

export interface EnergyMix {
  is_green_energy: boolean;
  energy_sources?: EnergySource[];
  environ_impact?: EnvironmentalImpact[];
  supplier_name?: string;
  energy_product_name?: string;
}

export interface Tariff {
  country_code: string;
  party_id: string;
  id: string;
  currency: string;
  type?: TariffType;
  tariff_alt_text?: DisplayText[];
  tariff_alt_url?: string;
  min_price?: Price;
  max_price?: Price;
  elements: TariffElement[];
  start_date_time?: Date;
  end_date_time?: Date;
  energy_mix?: EnergyMix;
  last_updated: Date;
}

interface CreateTariffInput {
  tariff_id: string;
  country_code?: string;
  party_id?: string;
  currency: string;
  type?: TariffType;
  tariff_alt_text?: DisplayText[];
  tariff_alt_url?: string;
  min_price?: Price;
  max_price?: Price;
  elements: TariffElement[];
  start_date_time?: Date;
  end_date_time?: Date;
  energy_mix?: EnergyMix;
}

interface UpdateTariffInput {
  country_code?: string;
  party_id?: string;
  currency?: string;
  type?: TariffType;
  tariff_alt_text?: DisplayText[];
  tariff_alt_url?: string;
  min_price?: Price;
  max_price?: Price;
  elements?: TariffElement[];
  start_date_time?: Date;
  end_date_time?: Date;
  energy_mix?: EnergyMix;
}

export class TariffsService {
  /**
   * Create a new tariff (OCPI 2.2.1 compliant)
   */
  async createTariff(input: CreateTariffInput): Promise<Tariff> {
    const dbId = uuidv4();
    const now = new Date();

    const result = await pool.query(
      `INSERT INTO tariffs (
        id, tariff_id, country_code, party_id, currency, type,
        tariff_alt_text, tariff_alt_url, min_price, max_price,
        elements, start_date_time, end_date_time, energy_mix, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        dbId,
        input.tariff_id,
        input.country_code || 'DE',
        input.party_id || 'VEC',
        input.currency,
        input.type || null,
        input.tariff_alt_text ? JSON.stringify(input.tariff_alt_text) : null,
        input.tariff_alt_url || null,
        input.min_price ? JSON.stringify(input.min_price) : null,
        input.max_price ? JSON.stringify(input.max_price) : null,
        JSON.stringify(input.elements),
        input.start_date_time || null,
        input.end_date_time || null,
        input.energy_mix ? JSON.stringify(input.energy_mix) : null,
        now,
      ]
    );

    return this.rowToTariff(result.rows[0]);
  }

  /**
   * Get a tariff by tariff_id
   */
  async getTariff(tariffId: string): Promise<Tariff | null> {
    const result = await pool.query(
      `SELECT * FROM tariffs WHERE tariff_id = $1`,
      [tariffId]
    );

    if (result.rows.length === 0) return null;
    return this.rowToTariff(result.rows[0]);
  }

  /**
   * Get tariff by country_code, party_id, id (OCPI standard lookup)
   */
  async getTariffByOcpiId(countryCode: string, partyId: string, tariffId: string): Promise<Tariff | null> {
    const result = await pool.query(
      `SELECT * FROM tariffs WHERE country_code = $1 AND party_id = $2 AND tariff_id = $3`,
      [countryCode, partyId, tariffId]
    );

    if (result.rows.length === 0) return null;
    return this.rowToTariff(result.rows[0]);
  }

  /**
   * List all tariffs with optional filters
   */
  async listTariffs(filters: {
    country_code?: string;
    party_id?: string;
    type?: TariffType;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ tariffs: Tariff[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.country_code) {
      conditions.push(`country_code = $${paramIndex++}`);
      values.push(filters.country_code);
    }
    if (filters.party_id) {
      conditions.push(`party_id = $${paramIndex++}`);
      values.push(filters.party_id);
    }
    if (filters.type) {
      conditions.push(`type = $${paramIndex++}`);
      values.push(filters.type);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tariffs ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const result = await pool.query(
      `SELECT * FROM tariffs ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset]
    );

    return {
      tariffs: result.rows.map((row) => this.rowToTariff(row)),
      total,
    };
  }

  /**
   * Update a tariff
   */
  async updateTariff(tariffId: string, input: UpdateTariffInput): Promise<Tariff | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fields: [keyof UpdateTariffInput, string, boolean][] = [
      ['country_code', 'country_code', false],
      ['party_id', 'party_id', false],
      ['currency', 'currency', false],
      ['type', 'type', false],
      ['tariff_alt_text', 'tariff_alt_text', true],
      ['tariff_alt_url', 'tariff_alt_url', false],
      ['min_price', 'min_price', true],
      ['max_price', 'max_price', true],
      ['elements', 'elements', true],
      ['start_date_time', 'start_date_time', false],
      ['end_date_time', 'end_date_time', false],
      ['energy_mix', 'energy_mix', true],
    ];

    for (const [key, col, isJson] of fields) {
      if (input[key] !== undefined) {
        updates.push(`${col} = $${paramIndex++}`);
        values.push(isJson ? JSON.stringify(input[key]) : input[key]);
      }
    }

    if (updates.length === 0) return null;

    updates.push(`last_updated = $${paramIndex++}`);
    values.push(new Date());
    values.push(tariffId);

    const result = await pool.query(
      `UPDATE tariffs SET ${updates.join(', ')} WHERE tariff_id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.rowToTariff(result.rows[0]);
  }

  /**
   * Delete a tariff
   */
  async deleteTariff(tariffId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM tariffs WHERE tariff_id = $1 RETURNING *`,
      [tariffId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  private parseJson(val: any): any {
    if (!val) return undefined;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return val; }
    }
    return val;
  }

  /**
   * Convert legacy price format to OCPI 2.2.1 Price
   */
  private convertPrice(val: any): Price | undefined {
    if (!val) return undefined;
    const parsed = this.parseJson(val);
    if (!parsed) return undefined;
    
    // Handle legacy format (before_taxes/after_taxes)
    if ('before_taxes' in parsed) {
      return {
        excl_vat: parsed.before_taxes,
        incl_vat: parsed.after_taxes,
      };
    }
    // Already OCPI 2.2.1 format
    if ('excl_vat' in parsed) {
      return parsed;
    }
    return undefined;
  }

  private rowToTariff(row: any): Tariff {
    return {
      country_code: row.country_code || 'DE',
      party_id: row.party_id || 'VEC',
      id: row.tariff_id,
      currency: row.currency,
      type: row.type || undefined,
      tariff_alt_text: this.parseJson(row.tariff_alt_text),
      tariff_alt_url: row.tariff_alt_url || undefined,
      min_price: this.convertPrice(row.min_price),
      max_price: this.convertPrice(row.max_price),
      elements: this.parseJson(row.elements) || [],
      start_date_time: row.start_date_time || undefined,
      end_date_time: row.end_date_time || undefined,
      energy_mix: this.parseJson(row.energy_mix),
      last_updated: row.last_updated,
    };
  }
}

export const tariffsService = new TariffsService();

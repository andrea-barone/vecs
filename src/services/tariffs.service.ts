import { v4 as uuidv4 } from 'uuid';
import pool from '../database/migrations';

interface PriceLimit {
  before_taxes: number;
  after_taxes?: number;
}

interface DisplayText {
  language: string;
  text: string;
}

interface CreateTariffInput {
  tariff_id: string;
  country_code?: string;
  party_id?: string;
  currency: string;
  type?: string;
  tariff_alt_text?: DisplayText[];
  tariff_alt_url?: string;
  min_price?: PriceLimit;
  max_price?: PriceLimit;
  preauthorize_amount?: number;
  elements: any[];
  tax_included?: string;
  start_date_time?: Date;
  end_date_time?: Date;
  energy_mix?: any;
}

interface UpdateTariffInput {
  country_code?: string;
  party_id?: string;
  currency?: string;
  type?: string;
  tariff_alt_text?: DisplayText[];
  tariff_alt_url?: string;
  min_price?: PriceLimit;
  max_price?: PriceLimit;
  preauthorize_amount?: number;
  elements?: any[];
  tax_included?: string;
  start_date_time?: Date;
  end_date_time?: Date;
  energy_mix?: any;
}

export class TariffsService {
  async createTariff(input: CreateTariffInput) {
    const dbId = uuidv4();
    const now = new Date();

    const result = await pool.query(
      `INSERT INTO tariffs (
        id, tariff_id, country_code, party_id, currency, type,
        tariff_alt_text, tariff_alt_url, min_price, max_price,
        preauthorize_amount, elements, tax_included,
        start_date_time, end_date_time, energy_mix, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
        input.preauthorize_amount || null,
        JSON.stringify(input.elements),
        input.tax_included || 'YES',
        input.start_date_time || null,
        input.end_date_time || null,
        input.energy_mix ? JSON.stringify(input.energy_mix) : null,
        now,
      ]
    );

    return this.rowToTariff(result.rows[0]);
  }

  async getTariff(tariffId: string) {
    const result = await pool.query(
      `SELECT * FROM tariffs WHERE tariff_id = $1`,
      [tariffId]
    );

    if (result.rows.length === 0) return null;
    return this.rowToTariff(result.rows[0]);
  }

  async listTariffs() {
    const result = await pool.query(`SELECT * FROM tariffs ORDER BY created_at DESC`);
    return result.rows.map((row) => this.rowToTariff(row));
  }

  async updateTariff(tariffId: string, input: UpdateTariffInput) {
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
      ['preauthorize_amount', 'preauthorize_amount', false],
      ['elements', 'elements', true],
      ['tax_included', 'tax_included', false],
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

  async deleteTariff(tariffId: string) {
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

  private rowToTariff(row: any) {
    return {
      country_code: row.country_code || 'DE',
      party_id: row.party_id || 'VEC',
      id: row.tariff_id,
      currency: row.currency,
      type: row.type || undefined,
      tariff_alt_text: this.parseJson(row.tariff_alt_text),
      tariff_alt_url: row.tariff_alt_url || undefined,
      min_price: this.parseJson(row.min_price),
      max_price: this.parseJson(row.max_price),
      preauthorize_amount: row.preauthorize_amount ? parseFloat(row.preauthorize_amount) : undefined,
      elements: this.parseJson(row.elements) || [],
      tax_included: row.tax_included || 'YES',
      start_date_time: row.start_date_time || undefined,
      end_date_time: row.end_date_time || undefined,
      energy_mix: this.parseJson(row.energy_mix),
      last_updated: row.last_updated,
    };
  }
}

export const tariffsService = new TariffsService();

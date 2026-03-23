import { v4 as uuidv4 } from 'uuid';
import pool from '../database/migrations';

interface CreateTariffInput {
  tariff_id: string;
  currency: string;
  type: string;
  elements: any[];
  display_text?: string;
  min_price?: number;
  max_price?: number;
}

interface UpdateTariffInput {
  currency?: string;
  type?: string;
  elements?: any[];
  display_text?: string;
  min_price?: number;
  max_price?: number;
}

export class TariffsService {
  async createTariff(input: CreateTariffInput) {
    const dbId = uuidv4();
    const now = new Date();

    const result = await pool.query(
      `INSERT INTO tariffs (
        id, tariff_id, currency, type, elements, display_text, 
        min_price, max_price, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        dbId,
        input.tariff_id,
        input.currency,
        input.type,
        JSON.stringify(input.elements),
        input.display_text || null,
        input.min_price || null,
        input.max_price || null,
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

    if (input.currency !== undefined) {
      updates.push(`currency = $${paramIndex++}`);
      values.push(input.currency);
    }
    if (input.type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(input.type);
    }
    if (input.elements !== undefined) {
      updates.push(`elements = $${paramIndex++}`);
      values.push(JSON.stringify(input.elements));
    }
    if (input.display_text !== undefined) {
      updates.push(`display_text = $${paramIndex++}`);
      values.push(input.display_text);
    }
    if (input.min_price !== undefined) {
      updates.push(`min_price = $${paramIndex++}`);
      values.push(input.min_price);
    }
    if (input.max_price !== undefined) {
      updates.push(`max_price = $${paramIndex++}`);
      values.push(input.max_price);
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

  private rowToTariff(row: any) {
    return {
      id: row.tariff_id,
      currency: row.currency,
      type: row.type,
      elements: typeof row.elements === 'string' ? JSON.parse(row.elements) : row.elements,
      display_text: row.display_text,
      min_price: row.min_price ? parseFloat(row.min_price) : undefined,
      max_price: row.max_price ? parseFloat(row.max_price) : undefined,
      last_updated: row.last_updated,
    };
  }
}

export const tariffsService = new TariffsService();

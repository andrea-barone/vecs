import { v4 as uuidv4 } from 'uuid';
import pool from '../database/migrations';

export interface Token {
  uid: string;
  type: 'RFID' | 'APP_USER' | 'AD_HOC_USER' | 'OTHER';
  auth_id: string;
  visual_number?: string;
  issuer: string;
  valid: boolean;
  whitelist?: 'ALWAYS' | 'ALLOWED' | 'ALLOWED_OFFLINE' | 'NEVER';
  language?: string;
  group_id?: string;
  last_updated: Date;
}

interface CreateTokenInput {
  token_uid: string;
  type: string;
  auth_id: string;
  visual_number?: string;
  issuer: string;
  valid?: boolean;
  whitelist?: string;
  language?: string;
  group_id?: string;
  emsp_id?: string;
  company_id?: string;
}

interface UpdateTokenInput {
  type?: string;
  auth_id?: string;
  visual_number?: string;
  issuer?: string;
  valid?: boolean;
  whitelist?: string;
  language?: string;
  group_id?: string;
}

class TokensService {
  /**
   * Create a new token
   */
  async createToken(input: CreateTokenInput): Promise<Token> {
    const dbId = uuidv4();
    const now = new Date();

    const result = await pool.query(
      `INSERT INTO tokens (
        id, token_uid, type, auth_id, visual_number, issuer,
        valid, whitelist, language, emsp_id, company_id, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        dbId,
        input.token_uid,
        input.type,
        input.auth_id,
        input.visual_number || null,
        input.issuer,
        input.valid !== false,
        input.whitelist || 'ALWAYS',
        input.language || null,
        input.emsp_id || null,
        input.company_id || null,
        now,
      ]
    );

    return this.rowToToken(result.rows[0]);
  }

  /**
   * Get a token by UID
   */
  async getToken(tokenUid: string): Promise<Token | null> {
    const result = await pool.query(
      `SELECT * FROM tokens WHERE token_uid = $1`,
      [tokenUid]
    );

    if (result.rows.length === 0) return null;
    return this.rowToToken(result.rows[0]);
  }

  /**
   * List all tokens with optional filters
   */
  async listTokens(filters: {
    type?: string;
    issuer?: string;
    valid?: boolean;
    emsp_id?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ tokens: Token[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.type) {
      conditions.push(`type = $${paramIndex++}`);
      values.push(filters.type);
    }
    if (filters.issuer) {
      conditions.push(`issuer = $${paramIndex++}`);
      values.push(filters.issuer);
    }
    if (filters.valid !== undefined) {
      conditions.push(`valid = $${paramIndex++}`);
      values.push(filters.valid);
    }
    if (filters.emsp_id) {
      conditions.push(`emsp_id = $${paramIndex++}`);
      values.push(filters.emsp_id);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tokens ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const result = await pool.query(
      `SELECT * FROM tokens ${whereClause} ORDER BY last_updated DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, limit, offset]
    );

    return {
      tokens: result.rows.map(row => this.rowToToken(row)),
      total,
    };
  }

  /**
   * Update a token
   */
  async updateToken(tokenUid: string, input: UpdateTokenInput): Promise<Token | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(input.type);
    }
    if (input.auth_id !== undefined) {
      updates.push(`auth_id = $${paramIndex++}`);
      values.push(input.auth_id);
    }
    if (input.visual_number !== undefined) {
      updates.push(`visual_number = $${paramIndex++}`);
      values.push(input.visual_number);
    }
    if (input.issuer !== undefined) {
      updates.push(`issuer = $${paramIndex++}`);
      values.push(input.issuer);
    }
    if (input.valid !== undefined) {
      updates.push(`valid = $${paramIndex++}`);
      values.push(input.valid);
    }
    if (input.whitelist !== undefined) {
      updates.push(`whitelist = $${paramIndex++}`);
      values.push(input.whitelist);
    }
    if (input.language !== undefined) {
      updates.push(`language = $${paramIndex++}`);
      values.push(input.language);
    }

    if (updates.length === 0) return null;

    updates.push(`last_updated = $${paramIndex++}`);
    values.push(new Date());
    values.push(tokenUid);

    const result = await pool.query(
      `UPDATE tokens SET ${updates.join(', ')} WHERE token_uid = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.rowToToken(result.rows[0]);
  }

  /**
   * Delete a token
   */
  async deleteToken(tokenUid: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM tokens WHERE token_uid = $1 RETURNING *`,
      [tokenUid]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Authorize a token (check if it's valid for charging)
   */
  async authorizeToken(tokenUid: string): Promise<{
    allowed: boolean;
    token?: Token;
    info?: {
      allowed: 'ALLOWED' | 'BLOCKED' | 'EXPIRED' | 'NO_CREDIT' | 'NOT_ALLOWED';
    };
  }> {
    const token = await this.getToken(tokenUid);

    if (!token) {
      return {
        allowed: false,
        info: { allowed: 'NOT_ALLOWED' },
      };
    }

    if (!token.valid) {
      return {
        allowed: false,
        token,
        info: { allowed: 'BLOCKED' },
      };
    }

    // Check whitelist status
    if (token.whitelist === 'NEVER') {
      return {
        allowed: false,
        token,
        info: { allowed: 'NOT_ALLOWED' },
      };
    }

    return {
      allowed: true,
      token,
      info: { allowed: 'ALLOWED' },
    };
  }

  /**
   * Create sample tokens for testing
   */
  async createSampleTokens(): Promise<Token[]> {
    const sampleTokens: CreateTokenInput[] = [
      {
        token_uid: 'RFID-001',
        type: 'RFID',
        auth_id: 'AUTH-001',
        visual_number: '****1234',
        issuer: 'VECS Test',
        valid: true,
        whitelist: 'ALWAYS',
      },
      {
        token_uid: 'RFID-002',
        type: 'RFID',
        auth_id: 'AUTH-002',
        visual_number: '****5678',
        issuer: 'VECS Test',
        valid: true,
        whitelist: 'ALWAYS',
      },
      {
        token_uid: 'APP-001',
        type: 'APP_USER',
        auth_id: 'AUTH-APP-001',
        issuer: 'VECS Test App',
        valid: true,
        whitelist: 'ALWAYS',
      },
      {
        token_uid: 'BLOCKED-001',
        type: 'RFID',
        auth_id: 'AUTH-BLOCKED',
        issuer: 'VECS Test',
        valid: false, // Blocked token for testing
        whitelist: 'NEVER',
      },
    ];

    const created: Token[] = [];
    for (const tokenInput of sampleTokens) {
      try {
        const existing = await this.getToken(tokenInput.token_uid);
        if (!existing) {
          const token = await this.createToken(tokenInput);
          created.push(token);
        }
      } catch (err) {
        // Token might already exist
      }
    }

    return created;
  }

  private rowToToken(row: any): Token {
    return {
      uid: row.token_uid,
      type: row.type,
      auth_id: row.auth_id,
      visual_number: row.visual_number,
      issuer: row.issuer,
      valid: row.valid,
      whitelist: row.whitelist,
      language: row.language,
      last_updated: row.last_updated,
    };
  }
}

export const tokensService = new TokensService();

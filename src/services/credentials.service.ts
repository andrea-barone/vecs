import { v4 as uuidv4 } from 'uuid';
import pool from '../database/migrations';
import { Credentials, PartyRole, BusinessDetails, OCPIResponse } from '../types/ocpi';

export class CredentialsService {
  async createCredentials(
    partyId: string,
    countryCode: string,
    businessDetails: BusinessDetails
  ): Promise<Credentials> {
    const id = uuidv4();
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await pool.query(
      `INSERT INTO emsp_credentials (
        id, token, party_id, country_code, business_name, 
        business_website, business_logo, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        token,
        partyId,
        countryCode,
        businessDetails.name,
        businessDetails.website || null,
        businessDetails.logo || null,
        expiresAt,
      ]
    );

    return {
      id,
      token,
      url: `${process.env.BASE_URL || 'http://localhost:3000'}/ocpi/2.2.1`,
      type: 'TOKEN',
      business_details: businessDetails,
      country_code: countryCode,
      party_id: partyId,
      role: PartyRole.CPO,
      version: '2.2.1',
      expires: expiresAt,
    };
  }

  async getCredentials(token: string): Promise<Credentials | null> {
    const result = await pool.query(
      `SELECT * FROM emsp_credentials WHERE token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      token: row.token,
      url: `${process.env.BASE_URL || 'http://localhost:3000'}/ocpi/2.2.1`,
      type: 'TOKEN',
      business_details: {
        name: row.business_name,
        website: row.business_website,
        logo: row.business_logo,
      },
      country_code: row.country_code,
      party_id: row.party_id,
      role: PartyRole.CPO,
      version: row.version,
      expires: row.expires_at,
    };
  }

  async validateToken(token: string): Promise<boolean> {
    const creds = await this.getCredentials(token);
    if (!creds) return false;

    // Check expiration
    return new Date() < creds.expires;
  }

  private generateToken(): string {
    return `VECS-${uuidv4().toUpperCase()}`;
  }
}

export const credentialsService = new CredentialsService();

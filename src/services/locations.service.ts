import { v4 as uuidv4 } from 'uuid';
import pool from '../database/migrations';
import { Location, EVSE, Connector, GeoLocation, BusinessDetails, Capability, ParkingRestriction } from '../types/ocpi';

interface CreateLocationInput {
  location_id: string;
  country_code?: string;
  party_id?: string;
  publish?: boolean;
  publish_allowed_to?: any[];
  type?: string;
  name?: string;
  address: string;
  city: string;
  postal_code?: string;
  state?: string;
  country: string;
  latitude: number;
  longitude: number;
  related_locations?: any[];
  directions?: any[];
  operator_name?: string;
  operator_website?: string;
  operator_logo?: string;
  suboperator_name?: string;
  suboperator_website?: string;
  owner_name?: string;
  owner_website?: string;
  time_zone?: string;
  opening_times?: any;
  charging_when_closed?: boolean;
  facilities?: string[];
  images?: any[];
  energy_mix?: any;
}

interface UpdateLocationInput {
  country_code?: string;
  party_id?: string;
  publish?: boolean;
  publish_allowed_to?: any[];
  type?: string;
  name?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  related_locations?: any[];
  directions?: any[];
  operator_name?: string;
  operator_website?: string;
  operator_logo?: string;
  suboperator_name?: string;
  suboperator_website?: string;
  owner_name?: string;
  owner_website?: string;
  time_zone?: string;
  opening_times?: any;
  charging_when_closed?: boolean;
  facilities?: string[];
  images?: any[];
  energy_mix?: any;
}

interface CreateEVSEInput {
  evse_id: string;
  uid?: string;
  status?: string;
  status_schedule?: any[];
  capabilities?: string[];
  floor_level?: string;
  latitude?: number;
  longitude?: number;
  physical_reference?: string;
  directions?: any[];
  parking_restrictions?: string[];
  images?: any[];
}

interface UpdateEVSEInput {
  status?: string;
  status_schedule?: any[];
  capabilities?: string[];
  floor_level?: string;
  latitude?: number;
  longitude?: number;
  physical_reference?: string;
  directions?: any[];
  parking_restrictions?: string[];
  images?: any[];
}

interface CreateConnectorInput {
  connector_id: string;
  standard: string;
  format: string;
  power_type: string;
  max_voltage: number;
  max_amperage: number;
  max_electric_power?: number;
  tariff_ids?: string[];
  terms_and_conditions?: string;
}

interface UpdateConnectorInput {
  standard?: string;
  format?: string;
  power_type?: string;
  max_voltage?: number;
  max_amperage?: number;
  max_electric_power?: number;
  tariff_ids?: string[];
  terms_and_conditions?: string;
}

export class LocationsService {
  // ============ LOCATIONS ============
  
  async createLocation(input: CreateLocationInput): Promise<Location> {
    const dbId = uuidv4();
    const now = new Date();

    const result = await pool.query(
      `INSERT INTO locations (
        id, location_id, country_code, party_id, publish, publish_allowed_to,
        type, name, address, city, postal_code, state, country,
        latitude, longitude, related_locations, directions,
        operator_name, operator_website, operator_logo,
        suboperator_name, suboperator_website,
        owner_name, owner_website,
        time_zone, opening_times, charging_when_closed,
        facilities, images, energy_mix, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
      RETURNING *`,
      [
        dbId,
        input.location_id,
        input.country_code || 'DE',
        input.party_id || 'VEC',
        input.publish !== false,
        input.publish_allowed_to ? JSON.stringify(input.publish_allowed_to) : null,
        input.type || 'OTHER',
        input.name || null,
        input.address,
        input.city,
        input.postal_code || null,
        input.state || null,
        input.country,
        input.latitude,
        input.longitude,
        input.related_locations ? JSON.stringify(input.related_locations) : null,
        input.directions ? JSON.stringify(input.directions) : null,
        input.operator_name || null,
        input.operator_website || null,
        input.operator_logo || null,
        input.suboperator_name || null,
        input.suboperator_website || null,
        input.owner_name || null,
        input.owner_website || null,
        input.time_zone || 'Europe/Berlin',
        input.opening_times ? JSON.stringify(input.opening_times) : null,
        input.charging_when_closed !== false,
        input.facilities ? JSON.stringify(input.facilities) : null,
        input.images ? JSON.stringify(input.images) : null,
        input.energy_mix ? JSON.stringify(input.energy_mix) : null,
        now,
      ]
    );

    return this.rowToLocation(result.rows[0]);
  }

  async updateLocation(locationId: string, input: UpdateLocationInput): Promise<Location | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fields: [keyof UpdateLocationInput, string, boolean][] = [
      ['country_code', 'country_code', false],
      ['party_id', 'party_id', false],
      ['publish', 'publish', false],
      ['publish_allowed_to', 'publish_allowed_to', true],
      ['type', 'type', false],
      ['name', 'name', false],
      ['address', 'address', false],
      ['city', 'city', false],
      ['postal_code', 'postal_code', false],
      ['state', 'state', false],
      ['country', 'country', false],
      ['latitude', 'latitude', false],
      ['longitude', 'longitude', false],
      ['related_locations', 'related_locations', true],
      ['directions', 'directions', true],
      ['operator_name', 'operator_name', false],
      ['operator_website', 'operator_website', false],
      ['operator_logo', 'operator_logo', false],
      ['suboperator_name', 'suboperator_name', false],
      ['suboperator_website', 'suboperator_website', false],
      ['owner_name', 'owner_name', false],
      ['owner_website', 'owner_website', false],
      ['time_zone', 'time_zone', false],
      ['opening_times', 'opening_times', true],
      ['charging_when_closed', 'charging_when_closed', false],
      ['facilities', 'facilities', true],
      ['images', 'images', true],
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
    values.push(locationId);

    const result = await pool.query(
      `UPDATE locations SET ${updates.join(', ')} WHERE location_id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    
    const location = this.rowToLocation(result.rows[0]);
    location.evses = await this.getEVSEsByLocation(result.rows[0].id);
    return location;
  }

  async deleteLocation(locationId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM locations WHERE location_id = $1 RETURNING *`,
      [locationId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getLocation(locationId: string): Promise<Location | null> {
    const result = await pool.query(
      `SELECT * FROM locations WHERE location_id = $1`,
      [locationId]
    );

    if (result.rows.length === 0) return null;

    const location = this.rowToLocation(result.rows[0]);
    location.evses = await this.getEVSEsByLocation(result.rows[0].id);
    return location;
  }

  async listLocations(): Promise<Location[]> {
    const result = await pool.query(`SELECT * FROM locations ORDER BY created_at DESC`);
    const locations: Location[] = [];

    for (const row of result.rows) {
      const location = this.rowToLocation(row);
      location.evses = await this.getEVSEsByLocation(row.id);
      locations.push(location);
    }

    return locations;
  }

  // ============ EVSEs ============

  async addEVSE(locationId: string, input: CreateEVSEInput): Promise<EVSE> {
    const locResult = await pool.query(
      `SELECT id FROM locations WHERE location_id = $1`,
      [locationId]
    );

    if (locResult.rows.length === 0) {
      throw new Error(`Location ${locationId} not found`);
    }

    const dbLocationId = locResult.rows[0].id;
    const dbId = uuidv4();

    const result = await pool.query(
      `INSERT INTO evses (
        id, location_id, uid, evse_id, status, status_schedule, capabilities,
        floor_level, latitude, longitude, physical_reference,
        directions, parking_restrictions, images, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        dbId,
        dbLocationId,
        input.uid || input.evse_id,
        input.evse_id,
        input.status || 'AVAILABLE',
        input.status_schedule ? JSON.stringify(input.status_schedule) : null,
        input.capabilities ? JSON.stringify(input.capabilities) : null,
        input.floor_level || null,
        input.latitude || null,
        input.longitude || null,
        input.physical_reference || null,
        input.directions ? JSON.stringify(input.directions) : null,
        input.parking_restrictions ? JSON.stringify(input.parking_restrictions) : null,
        input.images ? JSON.stringify(input.images) : null,
        new Date(),
      ]
    );

    const evse = this.rowToEVSE(result.rows[0]);
    evse.connectors = [];
    return evse;
  }

  async updateEVSE(evseId: string, input: UpdateEVSEInput): Promise<EVSE | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fields: [keyof UpdateEVSEInput, string, boolean][] = [
      ['status', 'status', false],
      ['status_schedule', 'status_schedule', true],
      ['capabilities', 'capabilities', true],
      ['floor_level', 'floor_level', false],
      ['latitude', 'latitude', false],
      ['longitude', 'longitude', false],
      ['physical_reference', 'physical_reference', false],
      ['directions', 'directions', true],
      ['parking_restrictions', 'parking_restrictions', true],
      ['images', 'images', true],
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
    values.push(evseId);

    const result = await pool.query(
      `UPDATE evses SET ${updates.join(', ')} WHERE evse_id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    
    const evse = this.rowToEVSE(result.rows[0]);
    const connResult = await pool.query(`SELECT * FROM connectors WHERE evse_id = $1`, [result.rows[0].id]);
    evse.connectors = connResult.rows.map((c: any) => this.rowToConnector(c));
    return evse;
  }

  async deleteEVSE(evseId: string): Promise<boolean> {
    const result = await pool.query(
      `DELETE FROM evses WHERE evse_id = $1 RETURNING *`,
      [evseId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ============ CONNECTORS ============

  async addConnector(evseId: string, input: CreateConnectorInput): Promise<Connector> {
    const evseResult = await pool.query(
      `SELECT id FROM evses WHERE evse_id = $1`,
      [evseId]
    );

    if (evseResult.rows.length === 0) {
      throw new Error(`EVSE ${evseId} not found`);
    }

    const dbEvseId = evseResult.rows[0].id;
    const dbId = uuidv4();

    const result = await pool.query(
      `INSERT INTO connectors (
        id, evse_id, connector_id, standard, format, power_type,
        max_voltage, max_amperage, max_electric_power, tariff_ids,
        terms_and_conditions, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        dbId,
        dbEvseId,
        input.connector_id,
        input.standard,
        input.format,
        input.power_type,
        input.max_voltage,
        input.max_amperage,
        input.max_electric_power || null,
        input.tariff_ids ? JSON.stringify(input.tariff_ids) : null,
        input.terms_and_conditions || null,
        new Date(),
      ]
    );

    return this.rowToConnector(result.rows[0]);
  }

  async updateConnector(evseId: string, connectorId: string, input: UpdateConnectorInput): Promise<Connector | null> {
    const evseResult = await pool.query(`SELECT id FROM evses WHERE evse_id = $1`, [evseId]);
    if (evseResult.rows.length === 0) return null;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fields: [keyof UpdateConnectorInput, string, boolean][] = [
      ['standard', 'standard', false],
      ['format', 'format', false],
      ['power_type', 'power_type', false],
      ['max_voltage', 'max_voltage', false],
      ['max_amperage', 'max_amperage', false],
      ['max_electric_power', 'max_electric_power', false],
      ['tariff_ids', 'tariff_ids', true],
      ['terms_and_conditions', 'terms_and_conditions', false],
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
    values.push(evseResult.rows[0].id);
    values.push(connectorId);

    const result = await pool.query(
      `UPDATE connectors SET ${updates.join(', ')} 
       WHERE evse_id = $${paramIndex} AND connector_id = $${paramIndex + 1} 
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.rowToConnector(result.rows[0]);
  }

  async deleteConnector(evseId: string, connectorId: string): Promise<boolean> {
    const evseResult = await pool.query(`SELECT id FROM evses WHERE evse_id = $1`, [evseId]);
    if (evseResult.rows.length === 0) return false;

    const result = await pool.query(
      `DELETE FROM connectors WHERE evse_id = $1 AND connector_id = $2 RETURNING *`,
      [evseResult.rows[0].id, connectorId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // ============ HELPERS ============

  private async getEVSEsByLocation(locationDbId: string): Promise<EVSE[]> {
    const result = await pool.query(
      `SELECT * FROM evses WHERE location_id = $1`,
      [locationDbId]
    );

    const evses: EVSE[] = [];
    for (const row of result.rows) {
      const evse = this.rowToEVSE(row);
      const connResult = await pool.query(
        `SELECT * FROM connectors WHERE evse_id = $1`,
        [row.id]
      );
      evse.connectors = connResult.rows.map((c: any) => this.rowToConnector(c));
      evses.push(evse);
    }

    return evses;
  }

  private parseJson(val: any): any {
    if (!val) return undefined;
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch { return val; }
    }
    return val;
  }

  private rowToLocation(row: any): Location {
    return {
      country_code: row.country_code || 'DE',
      party_id: row.party_id || 'VEC',
      id: row.location_id,
      publish: row.publish !== false,
      publish_allowed_to: this.parseJson(row.publish_allowed_to),
      name: row.name || undefined,
      address: row.address,
      city: row.city,
      postal_code: row.postal_code || undefined,
      state: row.state || undefined,
      country: row.country,
      coordinates: {
        latitude: String(row.latitude),
        longitude: String(row.longitude),
      },
      related_locations: this.parseJson(row.related_locations),
      parking_type: row.type !== 'OTHER' ? row.type : undefined,
      evses: [],
      directions: this.parseJson(row.directions),
      operator: row.operator_name ? {
        name: row.operator_name,
        website: row.operator_website || undefined,
        logo: row.operator_logo ? { url: row.operator_logo, category: 'OPERATOR', type: 'image/png' } : undefined,
      } : undefined,
      suboperator: row.suboperator_name ? {
        name: row.suboperator_name,
        website: row.suboperator_website || undefined,
      } : undefined,
      owner: row.owner_name ? {
        name: row.owner_name,
        website: row.owner_website || undefined,
      } : undefined,
      facilities: this.parseJson(row.facilities),
      time_zone: row.time_zone || 'Europe/Berlin',
      opening_times: this.parseJson(row.opening_times),
      charging_when_closed: row.charging_when_closed,
      images: this.parseJson(row.images),
      energy_mix: this.parseJson(row.energy_mix),
      last_updated: row.last_updated,
    };
  }

  private rowToEVSE(row: any): EVSE {
    return {
      uid: row.uid,
      evse_id: row.evse_id || undefined,
      status: row.status,
      status_schedule: this.parseJson(row.status_schedule),
      capabilities: this.parseJson(row.capabilities),
      connectors: [],
      floor_level: row.floor_level || undefined,
      coordinates: row.latitude && row.longitude ? {
        latitude: String(row.latitude),
        longitude: String(row.longitude),
      } : undefined,
      physical_reference: row.physical_reference || undefined,
      directions: this.parseJson(row.directions),
      parking_restrictions: this.parseJson(row.parking_restrictions),
      images: this.parseJson(row.images),
      last_updated: row.last_updated,
    };
  }

  private rowToConnector(row: any): Connector {
    return {
      id: row.connector_id,
      standard: row.standard,
      format: row.format,
      power_type: row.power_type,
      max_voltage: row.max_voltage || row.voltage,
      max_amperage: row.max_amperage || row.amperage,
      max_electric_power: row.max_electric_power || undefined,
      tariff_ids: this.parseJson(row.tariff_ids) || (row.tariff_id ? [row.tariff_id] : undefined),
      terms_and_conditions: row.terms_and_conditions || undefined,
      last_updated: row.last_updated,
    };
  }
}

export const locationsService = new LocationsService();

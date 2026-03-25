import { Router, Response } from 'express';
import { credentialsService } from '../services/credentials.service';
import { locationsService } from '../services/locations.service';
import { tariffsService } from '../services/tariffs.service';
import { sessionsService, SessionStatus } from '../services/sessions.service';
import { cdrsService } from '../services/cdrs.service';
import { tokensService, TokenType } from '../services/tokens.service';
import { commandsService } from '../services/commands.service';
import { ocpiAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Helper for OCPI response format
const ocpiResponse = (data: any, statusCode: number, message: string, res: Response) => {
  const httpStatus = statusCode === 1000 || statusCode === 1001 ? 200 : statusCode >= 2000 ? 400 : 200;
  res.status(httpStatus).json({
    data,
    status_code: statusCode,
    status_message: message,
    timestamp: new Date().toISOString(),
  });
};

// ========================================
// CREDENTIALS ENDPOINTS
// ========================================

router.post('/credentials', async (req: AuthRequest, res: Response) => {
  try {
    const { party_id, country_code, business_details } = req.body;

    if (!party_id || !country_code || !business_details?.name) {
      return ocpiResponse(null, 3000, 'Missing required fields: party_id, country_code, business_details.name', res);
    }

    const credentials = await credentialsService.createCredentials(party_id, country_code, business_details);
    ocpiResponse(credentials, 1000, 'Credentials created successfully', res);
  } catch (err) {
    console.error('Error creating credentials:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

router.get('/credentials', ocpiAuth, async (req: AuthRequest, res: Response) => {
  try {
    const credentials = await credentialsService.getCredentials(req.token!);
    if (!credentials) {
      return ocpiResponse(null, 2004, 'Credentials not found', res);
    }
    ocpiResponse(credentials, 1000, 'Credentials retrieved successfully', res);
  } catch (err) {
    console.error('Error getting credentials:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

// ========================================
// LOCATIONS ENDPOINTS
// ========================================

router.get('/locations', async (req: AuthRequest, res: Response) => {
  try {
    const locations = await locationsService.listLocations();
    ocpiResponse(locations, 1000, 'Locations retrieved successfully', res);
  } catch (err) {
    console.error('Error listing locations:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

router.get('/locations/:location_id', async (req: AuthRequest, res: Response) => {
  try {
    const location_id = Array.isArray(req.params.location_id) ? req.params.location_id[0] : req.params.location_id;
    const location = await locationsService.getLocation(location_id);
    if (!location) {
      return ocpiResponse(null, 2004, `Location ${location_id} not found`, res);
    }
    ocpiResponse(location, 1000, 'Location retrieved successfully', res);
  } catch (err) {
    console.error('Error getting location:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

router.post('/locations', async (req: AuthRequest, res: Response) => {
  try {
    const { 
      location_id, country_code, party_id, publish, publish_allowed_to,
      type, name, address, city, postal_code, state, country,
      latitude, longitude, related_locations, directions,
      operator_name, operator_website, operator_logo,
      suboperator_name, suboperator_website,
      owner_name, owner_website,
      time_zone, opening_times, charging_when_closed,
      facilities, images, energy_mix
    } = req.body;

    if (!location_id || !address || !city || !country) {
      return ocpiResponse(null, 3000, 'Missing required fields: location_id, address, city, country', res);
    }
    if (latitude === undefined || longitude === undefined) {
      return ocpiResponse(null, 3000, 'Missing required fields: latitude, longitude', res);
    }

    const location = await locationsService.createLocation({
      location_id, country_code, party_id, publish, publish_allowed_to,
      type, name, address, city, postal_code, state, country,
      latitude: parseFloat(latitude), longitude: parseFloat(longitude),
      related_locations, directions,
      operator_name, operator_website, operator_logo,
      suboperator_name, suboperator_website,
      owner_name, owner_website,
      time_zone, opening_times, charging_when_closed,
      facilities, images, energy_mix,
    });

    ocpiResponse(location, 1001, 'Location created successfully', res);
  } catch (err: any) {
    console.error('Error creating location:', err);
    if (err.message?.includes('duplicate key')) {
      return ocpiResponse(null, 3002, 'Location already exists', res);
    }
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

router.patch('/locations/:location_id', async (req: AuthRequest, res: Response) => {
  try {
    const location_id = Array.isArray(req.params.location_id) ? req.params.location_id[0] : req.params.location_id;
    const location = await locationsService.updateLocation(location_id, req.body);
    if (!location) {
      return ocpiResponse(null, 2004, `Location ${location_id} not found`, res);
    }
    ocpiResponse(location, 1000, 'Location updated successfully', res);
  } catch (err) {
    console.error('Error updating location:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

router.delete('/locations/:location_id', async (req: AuthRequest, res: Response) => {
  try {
    const location_id = Array.isArray(req.params.location_id) ? req.params.location_id[0] : req.params.location_id;
    const deleted = await locationsService.deleteLocation(location_id);
    if (!deleted) {
      return ocpiResponse(null, 2004, `Location ${location_id} not found`, res);
    }
    ocpiResponse(null, 1000, 'Location deleted successfully', res);
  } catch (err) {
    console.error('Error deleting location:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

// ========================================
// EVSE ENDPOINTS
// ========================================

router.post('/locations/:location_id/evses', async (req: AuthRequest, res: Response) => {
  try {
    const location_id = Array.isArray(req.params.location_id) ? req.params.location_id[0] : req.params.location_id;
    const { 
      evse_id, uid, status, status_schedule, capabilities,
      floor_level, latitude, longitude, physical_reference,
      directions, parking_restrictions, images
    } = req.body;

    if (!evse_id) {
      return ocpiResponse(null, 3000, 'Missing required field: evse_id', res);
    }

    const evse = await locationsService.addEVSE(location_id, { 
      evse_id, uid, status, status_schedule, capabilities,
      floor_level, 
      latitude: latitude ? parseFloat(latitude) : undefined,
      longitude: longitude ? parseFloat(longitude) : undefined,
      physical_reference, directions, parking_restrictions, images
    });
    ocpiResponse(evse, 1001, 'EVSE created successfully', res);
  } catch (err: any) {
    console.error('Error adding EVSE:', err);
    if (err.message?.includes('not found')) {
      return ocpiResponse(null, 2004, err.message, res);
    }
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

router.patch('/locations/:location_id/evses/:evse_id', async (req: AuthRequest, res: Response) => {
  try {
    const evse_id = Array.isArray(req.params.evse_id) ? req.params.evse_id[0] : req.params.evse_id;
    const evse = await locationsService.updateEVSE(evse_id, req.body);
    if (!evse) {
      return ocpiResponse(null, 2004, `EVSE ${evse_id} not found`, res);
    }
    ocpiResponse(evse, 1000, 'EVSE updated successfully', res);
  } catch (err) {
    console.error('Error updating EVSE:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

router.delete('/locations/:location_id/evses/:evse_id', async (req: AuthRequest, res: Response) => {
  try {
    const evse_id = Array.isArray(req.params.evse_id) ? req.params.evse_id[0] : req.params.evse_id;
    const deleted = await locationsService.deleteEVSE(evse_id);
    if (!deleted) {
      return ocpiResponse(null, 2004, `EVSE ${evse_id} not found`, res);
    }
    ocpiResponse(null, 1000, 'EVSE deleted successfully', res);
  } catch (err) {
    console.error('Error deleting EVSE:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

// ========================================
// CONNECTOR ENDPOINTS
// ========================================

router.post('/locations/:location_id/evses/:evse_id/connectors', async (req: AuthRequest, res: Response) => {
  try {
    const evse_id = Array.isArray(req.params.evse_id) ? req.params.evse_id[0] : req.params.evse_id;
    const { 
      connector_id, standard, format, power_type, 
      max_voltage, max_amperage, voltage, amperage,  // Support both old and new naming
      max_electric_power, tariff_ids, tariff_id, terms_and_conditions
    } = req.body;

    const finalVoltage = max_voltage || voltage;
    const finalAmperage = max_amperage || amperage;

    if (!connector_id || !standard || !format || !power_type || !finalVoltage || !finalAmperage) {
      return ocpiResponse(null, 3000, 'Missing required fields: connector_id, standard, format, power_type, max_voltage, max_amperage', res);
    }

    const connector = await locationsService.addConnector(evse_id, {
      connector_id, standard, format, power_type,
      max_voltage: parseInt(finalVoltage),
      max_amperage: parseInt(finalAmperage),
      max_electric_power: max_electric_power ? parseInt(max_electric_power) : undefined,
      tariff_ids: tariff_ids || (tariff_id ? [tariff_id] : undefined),
      terms_and_conditions,
    });

    ocpiResponse(connector, 1001, 'Connector created successfully', res);
  } catch (err: any) {
    console.error('Error adding connector:', err);
    if (err.message?.includes('not found')) {
      return ocpiResponse(null, 2004, err.message, res);
    }
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

router.patch('/locations/:location_id/evses/:evse_id/connectors/:connector_id', async (req: AuthRequest, res: Response) => {
  try {
    const evse_id = Array.isArray(req.params.evse_id) ? req.params.evse_id[0] : req.params.evse_id;
    const connector_id = Array.isArray(req.params.connector_id) ? req.params.connector_id[0] : req.params.connector_id;
    
    const connector = await locationsService.updateConnector(evse_id, connector_id, req.body);
    if (!connector) {
      return ocpiResponse(null, 2004, `Connector ${connector_id} not found`, res);
    }
    ocpiResponse(connector, 1000, 'Connector updated successfully', res);
  } catch (err) {
    console.error('Error updating connector:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

router.delete('/locations/:location_id/evses/:evse_id/connectors/:connector_id', async (req: AuthRequest, res: Response) => {
  try {
    const evse_id = Array.isArray(req.params.evse_id) ? req.params.evse_id[0] : req.params.evse_id;
    const connector_id = Array.isArray(req.params.connector_id) ? req.params.connector_id[0] : req.params.connector_id;
    
    const deleted = await locationsService.deleteConnector(evse_id, connector_id);
    if (!deleted) {
      return ocpiResponse(null, 2004, `Connector ${connector_id} not found`, res);
    }
    ocpiResponse(null, 1000, 'Connector deleted successfully', res);
  } catch (err) {
    console.error('Error deleting connector:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

// ========================================
// TARIFF ENDPOINTS
// ========================================

router.get('/tariffs', async (req: AuthRequest, res: Response) => {
  try {
    const tariffs = await tariffsService.listTariffs();
    ocpiResponse(tariffs, 1000, 'Tariffs retrieved successfully', res);
  } catch (err) {
    console.error('Error listing tariffs:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

router.get('/tariffs/:tariff_id', async (req: AuthRequest, res: Response) => {
  try {
    const tariff_id = Array.isArray(req.params.tariff_id) ? req.params.tariff_id[0] : req.params.tariff_id;
    const tariff = await tariffsService.getTariff(tariff_id);
    if (!tariff) {
      return ocpiResponse(null, 2004, `Tariff ${tariff_id} not found`, res);
    }
    ocpiResponse(tariff, 1000, 'Tariff retrieved successfully', res);
  } catch (err) {
    console.error('Error getting tariff:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

router.post('/tariffs', async (req: AuthRequest, res: Response) => {
  try {
    const { 
      tariff_id, country_code, party_id, currency, type,
      tariff_alt_text, tariff_alt_url, min_price, max_price,
      elements, start_date_time, end_date_time, energy_mix
    } = req.body;

    if (!tariff_id || !currency) {
      return ocpiResponse(null, 3000, 'Missing required fields: tariff_id, currency', res);
    }

    const tariff = await tariffsService.createTariff({
      tariff_id, country_code, party_id, currency, type,
      tariff_alt_text, tariff_alt_url, min_price, max_price,
      elements: elements || [],
      start_date_time, end_date_time, energy_mix,
    });

    ocpiResponse(tariff, 1001, 'Tariff created successfully', res);
  } catch (err: any) {
    console.error('Error creating tariff:', err);
    if (err.message?.includes('duplicate key')) {
      return ocpiResponse(null, 3002, 'Tariff already exists', res);
    }
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

router.patch('/tariffs/:tariff_id', async (req: AuthRequest, res: Response) => {
  try {
    const tariff_id = Array.isArray(req.params.tariff_id) ? req.params.tariff_id[0] : req.params.tariff_id;
    const tariff = await tariffsService.updateTariff(tariff_id, req.body);
    if (!tariff) {
      return ocpiResponse(null, 2004, `Tariff ${tariff_id} not found`, res);
    }
    ocpiResponse(tariff, 1000, 'Tariff updated successfully', res);
  } catch (err) {
    console.error('Error updating tariff:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

router.delete('/tariffs/:tariff_id', async (req: AuthRequest, res: Response) => {
  try {
    const tariff_id = Array.isArray(req.params.tariff_id) ? req.params.tariff_id[0] : req.params.tariff_id;
    const deleted = await tariffsService.deleteTariff(tariff_id);
    if (!deleted) {
      return ocpiResponse(null, 2004, `Tariff ${tariff_id} not found`, res);
    }
    ocpiResponse(null, 1000, 'Tariff deleted successfully', res);
  } catch (err) {
    console.error('Error deleting tariff:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

// ========================================
// SESSIONS ENDPOINTS
// ========================================

router.get('/sessions', async (req: AuthRequest, res: Response) => {
  try {
    const filters = {
      status: req.query.status as SessionStatus | undefined,
      location_id: req.query.location_id as string | undefined,
      token_uid: req.query.token_uid as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await sessionsService.listSessions(filters);
    
    res.set('X-Total-Count', result.total.toString());
    res.set('X-Limit', filters.limit.toString());
    
    ocpiResponse(result.sessions, 1000, 'Sessions retrieved successfully', res);
  } catch (err) {
    console.error('Error listing sessions:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

// OCPI 2.2.1 compliant path: /sessions/:country_code/:party_id/:session_id
router.get('/sessions/:country_code/:party_id/:session_id', async (req: AuthRequest, res: Response) => {
  try {
    const country_code = Array.isArray(req.params.country_code) ? req.params.country_code[0] : req.params.country_code;
    const party_id = Array.isArray(req.params.party_id) ? req.params.party_id[0] : req.params.party_id;
    const session_id = Array.isArray(req.params.session_id) ? req.params.session_id[0] : req.params.session_id;
    
    const session = await sessionsService.getSessionByOcpiId(country_code, party_id, session_id);
    if (!session) {
      return ocpiResponse(null, 2004, `Session ${country_code}/${party_id}/${session_id} not found`, res);
    }
    ocpiResponse(session, 1000, 'Session retrieved successfully', res);
  } catch (err) {
    console.error('Error getting session:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

// Legacy path (backward compatible)
router.get('/sessions/:session_id', async (req: AuthRequest, res: Response) => {
  try {
    const session_id = Array.isArray(req.params.session_id) ? req.params.session_id[0] : req.params.session_id;
    const session = await sessionsService.getSession(session_id);
    if (!session) {
      return ocpiResponse(null, 2004, `Session ${session_id} not found`, res);
    }
    ocpiResponse(session, 1000, 'Session retrieved successfully', res);
  } catch (err) {
    console.error('Error getting session:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

// PUT is used by eMSP to receive session updates (receiver interface)
router.put('/sessions/:session_id', async (req: AuthRequest, res: Response) => {
  try {
    const session_id = Array.isArray(req.params.session_id) ? req.params.session_id[0] : req.params.session_id;
    // This is the receiver interface - eMSPs receive session data from CPO
    // For our simulator, we just acknowledge receipt
    const session = await sessionsService.getSession(session_id);
    if (!session) {
      return ocpiResponse(null, 2004, `Session ${session_id} not found`, res);
    }
    ocpiResponse(session, 1000, 'Session acknowledged', res);
  } catch (err) {
    console.error('Error on PUT session:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

// ========================================
// CDR ENDPOINTS
// ========================================

router.get('/cdrs', async (req: AuthRequest, res: Response) => {
  try {
    const filters = {
      location_id: req.query.location_id as string | undefined,
      auth_id: req.query.auth_id as string | undefined,
      startTime: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
      endTime: req.query.date_to ? new Date(req.query.date_to as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await cdrsService.listCDRs(filters);
    
    res.set('X-Total-Count', result.total.toString());
    res.set('X-Limit', filters.limit.toString());
    
    ocpiResponse(result.cdrs, 1000, 'CDRs retrieved successfully', res);
  } catch (err) {
    console.error('Error listing CDRs:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

// OCPI 2.2.1 compliant path: /cdrs/:country_code/:party_id/:cdr_id
router.get('/cdrs/:country_code/:party_id/:cdr_id', async (req: AuthRequest, res: Response) => {
  try {
    const country_code = Array.isArray(req.params.country_code) ? req.params.country_code[0] : req.params.country_code;
    const party_id = Array.isArray(req.params.party_id) ? req.params.party_id[0] : req.params.party_id;
    const cdr_id = Array.isArray(req.params.cdr_id) ? req.params.cdr_id[0] : req.params.cdr_id;
    
    const cdr = await cdrsService.getCDRByOcpiId(country_code, party_id, cdr_id);
    if (!cdr) {
      return ocpiResponse(null, 2004, `CDR ${country_code}/${party_id}/${cdr_id} not found`, res);
    }
    ocpiResponse(cdr, 1000, 'CDR retrieved successfully', res);
  } catch (err) {
    console.error('Error getting CDR:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

// Legacy path (backward compatible)
router.get('/cdrs/:cdr_id', async (req: AuthRequest, res: Response) => {
  try {
    const cdr_id = Array.isArray(req.params.cdr_id) ? req.params.cdr_id[0] : req.params.cdr_id;
    const cdr = await cdrsService.getCDR(cdr_id);
    if (!cdr) {
      return ocpiResponse(null, 2004, `CDR ${cdr_id} not found`, res);
    }
    ocpiResponse(cdr, 1000, 'CDR retrieved successfully', res);
  } catch (err) {
    console.error('Error getting CDR:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

// ========================================
// TOKENS ENDPOINTS
// ========================================

router.get('/tokens', async (req: AuthRequest, res: Response) => {
  try {
    const filters = {
      type: req.query.type as TokenType | undefined,
      issuer: req.query.issuer as string | undefined,
      valid: req.query.valid !== undefined ? req.query.valid === 'true' : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const result = await tokensService.listTokens(filters);
    
    res.set('X-Total-Count', result.total.toString());
    res.set('X-Limit', filters.limit.toString());
    
    ocpiResponse(result.tokens, 1000, 'Tokens retrieved successfully', res);
  } catch (err) {
    console.error('Error listing tokens:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

router.get('/tokens/:token_uid', async (req: AuthRequest, res: Response) => {
  try {
    const token_uid = Array.isArray(req.params.token_uid) ? req.params.token_uid[0] : req.params.token_uid;
    const token = await tokensService.getToken(token_uid);
    if (!token) {
      return ocpiResponse(null, 2004, `Token ${token_uid} not found`, res);
    }
    ocpiResponse(token, 1000, 'Token retrieved successfully', res);
  } catch (err) {
    console.error('Error getting token:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

// POST token authorize (eMSP sends token to CPO for authorization)
router.post('/tokens/:token_uid/authorize', async (req: AuthRequest, res: Response) => {
  try {
    const token_uid = Array.isArray(req.params.token_uid) ? req.params.token_uid[0] : req.params.token_uid;
    const result = await tokensService.authorizeToken(token_uid);
    
    ocpiResponse({
      allowed: result.info?.allowed || 'NOT_ALLOWED',
      token: result.token,
      authorization_reference: result.allowed ? `AUTH-${Date.now()}` : undefined,
    }, 1000, result.allowed ? 'Token authorized' : 'Token not authorized', res);
  } catch (err) {
    console.error('Error authorizing token:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

// PUT is used by eMSP to push token updates to CPO (OCPI 2.2.1)
router.put('/tokens/:country_code/:party_id/:token_uid', async (req: AuthRequest, res: Response) => {
  try {
    const country_code = Array.isArray(req.params.country_code) ? req.params.country_code[0] : req.params.country_code;
    const party_id = Array.isArray(req.params.party_id) ? req.params.party_id[0] : req.params.party_id;
    const token_uid = Array.isArray(req.params.token_uid) ? req.params.token_uid[0] : req.params.token_uid;
    const { 
      type, contract_id, visual_number, issuer, group_id,
      valid, whitelist, language, default_profile_type, energy_contract 
    } = req.body;

    // Check if token exists, if not create it
    let token = await tokensService.getTokenByOcpiId(country_code, party_id, token_uid);
    
    if (!token) {
      if (!type || !contract_id || !issuer) {
        return ocpiResponse(null, 3000, 'Missing required fields for new token: type, contract_id, issuer', res);
      }
      token = await tokensService.createToken({
        country_code,
        party_id,
        token_uid,
        type,
        contract_id,
        visual_number,
        issuer,
        group_id,
        valid,
        whitelist,
        language,
        default_profile_type,
        energy_contract,
      });
      return ocpiResponse(token, 1001, 'Token created successfully', res);
    }

    // Update existing token
    token = await tokensService.updateToken(token_uid, {
      type,
      contract_id,
      visual_number,
      issuer,
      group_id,
      valid,
      whitelist,
      language,
      default_profile_type,
      energy_contract,
    });

    ocpiResponse(token, 1000, 'Token updated successfully', res);
  } catch (err) {
    console.error('Error on PUT token:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

// Legacy PUT endpoint (backward compatible)
router.put('/tokens/:token_uid', async (req: AuthRequest, res: Response) => {
  try {
    const token_uid = Array.isArray(req.params.token_uid) ? req.params.token_uid[0] : req.params.token_uid;
    const { 
      country_code, party_id, type, contract_id, auth_id, // auth_id for backward compat
      visual_number, issuer, group_id, valid, whitelist, language,
      default_profile_type, energy_contract 
    } = req.body;

    const effectiveContractId = contract_id || auth_id;

    // Check if token exists, if not create it
    let token = await tokensService.getToken(token_uid);
    
    if (!token) {
      if (!type || !effectiveContractId || !issuer) {
        return ocpiResponse(null, 3000, 'Missing required fields for new token: type, contract_id, issuer', res);
      }
      token = await tokensService.createToken({
        country_code: country_code || 'DE',
        party_id: party_id || 'VEC',
        token_uid,
        type,
        contract_id: effectiveContractId,
        visual_number,
        issuer,
        group_id,
        valid,
        whitelist,
        language,
        default_profile_type,
        energy_contract,
      });
      return ocpiResponse(token, 1001, 'Token created successfully', res);
    }

    // Update existing token
    token = await tokensService.updateToken(token_uid, {
      type,
      contract_id: effectiveContractId,
      visual_number,
      issuer,
      group_id,
      valid,
      whitelist,
      language,
      default_profile_type,
      energy_contract,
    });

    ocpiResponse(token, 1000, 'Token updated successfully', res);
  } catch (err) {
    console.error('Error on PUT token:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

router.patch('/tokens/:token_uid', async (req: AuthRequest, res: Response) => {
  try {
    const token_uid = Array.isArray(req.params.token_uid) ? req.params.token_uid[0] : req.params.token_uid;
    const token = await tokensService.updateToken(token_uid, req.body);
    if (!token) {
      return ocpiResponse(null, 2004, `Token ${token_uid} not found`, res);
    }
    ocpiResponse(token, 1000, 'Token updated successfully', res);
  } catch (err) {
    console.error('Error updating token:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

// Admin endpoint to create sample tokens
router.post('/tokens/samples', async (req: AuthRequest, res: Response) => {
  try {
    const created = await tokensService.createSampleTokens();
    ocpiResponse(created, 1001, `Created ${created.length} sample tokens`, res);
  } catch (err) {
    console.error('Error creating sample tokens:', err);
    ocpiResponse(null, 2000, 'Internal server error', res);
  }
});

// ========================================
// COMMANDS ENDPOINTS
// ========================================

router.post('/commands/START_SESSION', async (req: AuthRequest, res: Response) => {
  try {
    const result = await commandsService.handleStartSession(req.body);
    ocpiResponse(result, result.result === 'ACCEPTED' ? 1000 : 3000, result.message || result.result, res);
  } catch (err) {
    console.error('Error on START_SESSION:', err);
    ocpiResponse({ result: 'REJECTED', message: 'Internal server error' }, 2000, 'Internal server error', res);
  }
});

router.post('/commands/STOP_SESSION', async (req: AuthRequest, res: Response) => {
  try {
    const result = await commandsService.handleStopSession(req.body);
    ocpiResponse(result, result.result === 'ACCEPTED' ? 1000 : 3000, result.message || result.result, res);
  } catch (err) {
    console.error('Error on STOP_SESSION:', err);
    ocpiResponse({ result: 'REJECTED', message: 'Internal server error' }, 2000, 'Internal server error', res);
  }
});

router.post('/commands/UNLOCK_CONNECTOR', async (req: AuthRequest, res: Response) => {
  try {
    const result = await commandsService.handleUnlockConnector(req.body);
    ocpiResponse(result, result.result === 'ACCEPTED' ? 1000 : 3000, result.message || result.result, res);
  } catch (err) {
    console.error('Error on UNLOCK_CONNECTOR:', err);
    ocpiResponse({ result: 'REJECTED', message: 'Internal server error' }, 2000, 'Internal server error', res);
  }
});

router.post('/commands/RESERVE_NOW', async (req: AuthRequest, res: Response) => {
  try {
    const result = await commandsService.handleReserveNow(req.body);
    ocpiResponse(result, result.result === 'ACCEPTED' ? 1000 : 3000, result.message || result.result, res);
  } catch (err) {
    console.error('Error on RESERVE_NOW:', err);
    ocpiResponse({ result: 'REJECTED', message: 'Internal server error' }, 2000, 'Internal server error', res);
  }
});

router.post('/commands/CANCEL_RESERVATION', async (req: AuthRequest, res: Response) => {
  try {
    const result = await commandsService.handleCancelReservation(req.body);
    ocpiResponse(result, result.result === 'ACCEPTED' ? 1000 : 3000, result.message || result.result, res);
  } catch (err) {
    console.error('Error on CANCEL_RESERVATION:', err);
    ocpiResponse({ result: 'REJECTED', message: 'Internal server error' }, 2000, 'Internal server error', res);
  }
});

// ========================================
// VERSIONS ENDPOINT (OCPI standard)
// ========================================

router.get('/versions', (req: AuthRequest, res: Response) => {
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  
  ocpiResponse([
    {
      version: '2.2.1',
      url: `${baseUrl}/ocpi/2.2.1`,
    }
  ], 1000, 'Versions retrieved successfully', res);
});

router.get('/', (req: AuthRequest, res: Response) => {
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  
  ocpiResponse({
    version: '2.2.1',
    endpoints: [
      { identifier: 'credentials', role: 'SENDER', url: `${baseUrl}/ocpi/2.2.1/credentials` },
      { identifier: 'locations', role: 'SENDER', url: `${baseUrl}/ocpi/2.2.1/locations` },
      { identifier: 'tariffs', role: 'SENDER', url: `${baseUrl}/ocpi/2.2.1/tariffs` },
      { identifier: 'sessions', role: 'SENDER', url: `${baseUrl}/ocpi/2.2.1/sessions` },
      { identifier: 'cdrs', role: 'SENDER', url: `${baseUrl}/ocpi/2.2.1/cdrs` },
      { identifier: 'tokens', role: 'RECEIVER', url: `${baseUrl}/ocpi/2.2.1/tokens` },
      { identifier: 'commands', role: 'RECEIVER', url: `${baseUrl}/ocpi/2.2.1/commands` },
    ],
  }, 1000, 'Version details retrieved successfully', res);
});

export default router;

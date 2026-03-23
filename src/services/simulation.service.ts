import { sessionsService, Session, ChargingPeriod } from './sessions.service';
import { cdrsService, CDR } from './cdrs.service';
import { logOutboundRequest } from '../middleware/requestLogger';
import pool from '../database/migrations';

interface SimulationState {
  sessionId: string;
  intervalId?: NodeJS.Timeout;
  kwh: number;
  kwhPerMinute: number;
}

// Active simulations
const activeSimulations: Map<string, SimulationState> = new Map();

class SimulationService {
  /**
   * Start a charging session simulation
   */
  async startCharging(params: {
    location_id: string;
    evse_id: string;
    connector_id: string;
    auth_id: string;
    auth_method?: string;
    power_kw?: number;
    auto_increment?: boolean;
  }): Promise<Session> {
    // Create the session
    const session = await sessionsService.createSession({
      location_id: params.location_id,
      evse_uid: params.evse_id,
      connector_id: params.connector_id,
      auth_id: params.auth_id,
      auth_method: params.auth_method || 'COMMAND',
    });

    // If auto_increment is true, start automatic meter updates
    if (params.auto_increment) {
      const powerKw = params.power_kw || 50; // Default 50kW
      const kwhPerMinute = powerKw / 60; // kWh per minute

      const state: SimulationState = {
        sessionId: session.session_id,
        kwh: 0,
        kwhPerMinute,
      };

      // Update every minute
      state.intervalId = setInterval(async () => {
        try {
          state.kwh += state.kwhPerMinute;
          await this.updateMeterValue(session.session_id, state.kwh);
        } catch (err) {
          console.error('Auto-increment error:', err);
        }
      }, 60000);

      activeSimulations.set(session.session_id, state);
    }

    return session;
  }

  /**
   * Update meter values for an active session
   */
  async updateMeterValue(sessionId: string, kwh: number): Promise<Session | null> {
    const session = await sessionsService.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'ACTIVE') {
      throw new Error(`Session ${sessionId} is not active`);
    }

    // Calculate charging period
    const startTime = new Date(session.start_date_time);
    const now = new Date();
    const durationHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    const chargingPeriods: ChargingPeriod[] = [{
      start_date_time: startTime,
      dimensions: [
        { type: 'ENERGY', volume: kwh },
        { type: 'TIME', volume: durationHours },
      ],
    }];

    const updated = await sessionsService.updateSession(sessionId, {
      kwh,
      charging_periods: chargingPeriods,
    });

    // Log this as an internal event
    await logOutboundRequest({
      endpointType: 'simulation',
      objectType: 'session',
      objectId: sessionId,
      method: 'UPDATE',
      url: 'internal://simulation',
      requestBody: { kwh, charging_periods: chargingPeriods },
      success: true,
    });

    return updated;
  }

  /**
   * Stop a charging session and optionally generate a CDR
   */
  async stopCharging(sessionId: string, options: {
    finalKwh?: number;
    generateCDR?: boolean;
    pricePerKwh?: number;
  } = {}): Promise<{ session: Session; cdr?: CDR }> {
    const session = await sessionsService.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Stop any automatic simulation
    const simState = activeSimulations.get(sessionId);
    if (simState?.intervalId) {
      clearInterval(simState.intervalId);
    }
    activeSimulations.delete(sessionId);

    // Calculate final kWh
    const finalKwh = options.finalKwh ?? simState?.kwh ?? session.kwh;

    // Calculate cost
    const pricePerKwh = options.pricePerKwh ?? 0.35; // Default €0.35/kWh
    const totalCost = finalKwh * pricePerKwh;

    // Stop the session
    const stoppedSession = await sessionsService.stopSession(sessionId, finalKwh, totalCost);
    if (!stoppedSession) {
      throw new Error(`Failed to stop session ${sessionId}`);
    }

    let cdr: CDR | undefined;

    // Generate CDR if requested
    if (options.generateCDR !== false) {
      cdr = await cdrsService.createCDRFromSession(
        sessionId,
        totalCost,
        totalCost * 1.19 // 19% VAT
      ) || undefined;
    }

    return { session: stoppedSession, cdr };
  }

  /**
   * Get all active simulations
   */
  getActiveSimulations(): { sessionId: string; kwh: number }[] {
    return Array.from(activeSimulations.entries()).map(([sessionId, state]) => ({
      sessionId,
      kwh: state.kwh,
    }));
  }

  /**
   * Simulate a full charge cycle (for testing)
   */
  async simulateFullCharge(params: {
    location_id: string;
    evse_id: string;
    connector_id: string;
    auth_id: string;
    duration_minutes?: number;
    power_kw?: number;
  }): Promise<{ session: Session; cdr: CDR }> {
    const durationMinutes = params.duration_minutes || 30;
    const powerKw = params.power_kw || 50;
    const totalKwh = (powerKw * durationMinutes) / 60;

    // Start session
    const session = await this.startCharging({
      location_id: params.location_id,
      evse_id: params.evse_id,
      connector_id: params.connector_id,
      auth_id: params.auth_id,
      auto_increment: false,
    });

    // Simulate meter updates at intervals
    const intervals = 5;
    const kwhPerInterval = totalKwh / intervals;
    
    for (let i = 1; i <= intervals; i++) {
      await this.updateMeterValue(session.session_id, kwhPerInterval * i);
    }

    // Stop and generate CDR
    const result = await this.stopCharging(session.session_id, {
      finalKwh: totalKwh,
      generateCDR: true,
    });

    return { session: result.session, cdr: result.cdr! };
  }

  /**
   * Push session update to connected eMSPs
   */
  async pushSessionUpdate(sessionId: string): Promise<void> {
    const session = await sessionsService.getSession(sessionId);
    if (!session) return;

    // Get all eMSPs with endpoints configured
    const emspsResult = await pool.query(`
      SELECT id, token, endpoints FROM emsp_credentials 
      WHERE endpoints IS NOT NULL AND endpoints->>'sessions' IS NOT NULL
    `);

    for (const emsp of emspsResult.rows) {
      const endpoints = typeof emsp.endpoints === 'string' 
        ? JSON.parse(emsp.endpoints) 
        : emsp.endpoints;
      
      const sessionsEndpoint = endpoints?.sessions;
      if (!sessionsEndpoint) continue;

      const url = `${sessionsEndpoint}/${session.session_id}`;
      const startTime = Date.now();
      
      try {
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${emsp.token}`,
          },
          body: JSON.stringify({
            data: session,
            status_code: 1000,
            status_message: 'Session updated',
            timestamp: new Date().toISOString(),
          }),
        });

        const responseBody = await response.json().catch(() => null);

        await logOutboundRequest({
          emspId: emsp.id,
          endpointType: 'sessions',
          objectType: 'session',
          objectId: session.session_id,
          method: 'PUT',
          url,
          requestHeaders: { 'Content-Type': 'application/json' },
          requestBody: session,
          responseStatus: response.status,
          responseBody,
          success: response.ok,
          durationMs: Date.now() - startTime,
        });
      } catch (err: any) {
        await logOutboundRequest({
          emspId: emsp.id,
          endpointType: 'sessions',
          objectType: 'session',
          objectId: session.session_id,
          method: 'PUT',
          url,
          requestBody: session,
          success: false,
          error: err.message,
          durationMs: Date.now() - startTime,
        });
      }
    }
  }
}

export const simulationService = new SimulationService();

import { v4 as uuidv4 } from 'uuid';
import pool from '../database/migrations';
import { simulationService } from './simulation.service';
import { tokensService } from './tokens.service';
import { logOutboundRequest } from '../middleware/requestLogger';

export type CommandType = 
  | 'CANCEL_RESERVATION'
  | 'RESERVE_NOW'
  | 'START_SESSION'
  | 'STOP_SESSION'
  | 'UNLOCK_CONNECTOR';

export type CommandResponseType = 
  | 'NOT_SUPPORTED'
  | 'REJECTED'
  | 'ACCEPTED'
  | 'UNKNOWN_SESSION';

export interface CommandResult {
  result: CommandResponseType;
  timeout?: number;
  message?: string;
}

export interface StartSessionCommand {
  response_url: string;
  token: {
    uid: string;
    type: string;
    auth_id: string;
    issuer: string;
    valid: boolean;
  };
  location_id: string;
  evse_uid?: string;
  connector_id?: string;
  authorization_reference?: string;
}

export interface StopSessionCommand {
  response_url: string;
  session_id: string;
}

export interface UnlockConnectorCommand {
  response_url: string;
  location_id: string;
  evse_uid: string;
  connector_id: string;
}

export interface ReserveNowCommand {
  response_url: string;
  token: {
    uid: string;
    type: string;
    auth_id: string;
    issuer: string;
    valid: boolean;
  };
  expiry_date: string;
  reservation_id: string;
  location_id: string;
  evse_uid?: string;
  authorization_reference?: string;
}

export interface CancelReservationCommand {
  response_url: string;
  reservation_id: string;
}

// Store for command responses (in production, this would be in Redis or DB)
const commandResponses: Map<string, {
  command_type: CommandType;
  result: CommandResponseType;
  message?: string;
  session_id?: string;
  created_at: Date;
}> = new Map();

class CommandsService {
  /**
   * Handle START_SESSION command
   */
  async handleStartSession(command: StartSessionCommand): Promise<CommandResult> {
    const commandId = uuidv4();
    
    try {
      // Validate the token
      const authResult = await tokensService.authorizeToken(command.token.uid);
      
      if (!authResult.allowed) {
        return {
          result: 'REJECTED',
          message: `Token not authorized: ${authResult.info?.allowed}`,
        };
      }

      // Find the EVSE and connector
      const locationResult = await pool.query(
        `SELECT l.id, l.location_id FROM locations l WHERE l.location_id = $1`,
        [command.location_id]
      );

      if (locationResult.rows.length === 0) {
        return {
          result: 'REJECTED',
          message: `Location ${command.location_id} not found`,
        };
      }

      // Get the first available EVSE if not specified
      let evseUid = command.evse_uid;
      let connectorId = command.connector_id;

      if (!evseUid) {
        const evseResult = await pool.query(
          `SELECT e.evse_id, c.connector_id 
           FROM evses e 
           JOIN connectors c ON c.evse_id = e.id
           WHERE e.location_id = $1 AND e.status = 'AVAILABLE'
           LIMIT 1`,
          [locationResult.rows[0].id]
        );

        if (evseResult.rows.length === 0) {
          return {
            result: 'REJECTED',
            message: 'No available EVSE found',
          };
        }

        evseUid = evseResult.rows[0].evse_id;
        connectorId = evseResult.rows[0].connector_id;
      }

      if (!connectorId) {
        connectorId = '1'; // Default connector
      }

      // Start the charging session
      const session = await simulationService.startCharging({
        location_id: command.location_id,
        evse_id: evseUid!,
        connector_id: connectorId!,
        auth_id: command.token.auth_id,
        auth_method: 'COMMAND',
      });

      // Store the command result
      commandResponses.set(commandId, {
        command_type: 'START_SESSION',
        result: 'ACCEPTED',
        session_id: session.session_id,
        created_at: new Date(),
      });

      // Send async response to response_url
      this.sendCommandResponse(command.response_url, {
        result: 'ACCEPTED',
        message: `Session ${session.session_id} started`,
      });

      return {
        result: 'ACCEPTED',
        timeout: 30,
        message: `Session ${session.session_id} starting`,
      };

    } catch (err: any) {
      return {
        result: 'REJECTED',
        message: err.message,
      };
    }
  }

  /**
   * Handle STOP_SESSION command
   */
  async handleStopSession(command: StopSessionCommand): Promise<CommandResult> {
    try {
      // Stop the session
      const result = await simulationService.stopCharging(command.session_id, {
        generateCDR: true,
      });

      if (!result.session) {
        return {
          result: 'UNKNOWN_SESSION',
          message: `Session ${command.session_id} not found`,
        };
      }

      // Send async response
      this.sendCommandResponse(command.response_url, {
        result: 'ACCEPTED',
        message: `Session ${command.session_id} stopped`,
      });

      return {
        result: 'ACCEPTED',
        timeout: 30,
        message: `Session ${command.session_id} stopping`,
      };

    } catch (err: any) {
      return {
        result: 'REJECTED',
        message: err.message,
      };
    }
  }

  /**
   * Handle UNLOCK_CONNECTOR command
   */
  async handleUnlockConnector(command: UnlockConnectorCommand): Promise<CommandResult> {
    // In a real system, this would send a command to the physical charger
    // For simulation, we just acknowledge the command

    // Verify the connector exists
    const result = await pool.query(
      `SELECT c.id FROM connectors c
       JOIN evses e ON c.evse_id = e.id
       JOIN locations l ON e.location_id = l.id
       WHERE l.location_id = $1 AND e.evse_id = $2 AND c.connector_id = $3`,
      [command.location_id, command.evse_uid, command.connector_id]
    );

    if (result.rows.length === 0) {
      return {
        result: 'REJECTED',
        message: 'Connector not found',
      };
    }

    // Send async response
    this.sendCommandResponse(command.response_url, {
      result: 'ACCEPTED',
      message: 'Connector unlocked',
    });

    return {
      result: 'ACCEPTED',
      timeout: 30,
      message: 'Unlocking connector',
    };
  }

  /**
   * Handle RESERVE_NOW command
   */
  async handleReserveNow(command: ReserveNowCommand): Promise<CommandResult> {
    // For simulation, we accept reservations but don't enforce them
    
    const authResult = await tokensService.authorizeToken(command.token.uid);
    
    if (!authResult.allowed) {
      return {
        result: 'REJECTED',
        message: `Token not authorized`,
      };
    }

    // Verify the location exists
    const locationResult = await pool.query(
      `SELECT id FROM locations WHERE location_id = $1`,
      [command.location_id]
    );

    if (locationResult.rows.length === 0) {
      return {
        result: 'REJECTED',
        message: `Location ${command.location_id} not found`,
      };
    }

    // Send async response
    this.sendCommandResponse(command.response_url, {
      result: 'ACCEPTED',
      message: `Reservation ${command.reservation_id} created`,
    });

    return {
      result: 'ACCEPTED',
      timeout: 30,
      message: `Creating reservation ${command.reservation_id}`,
    };
  }

  /**
   * Handle CANCEL_RESERVATION command
   */
  async handleCancelReservation(command: CancelReservationCommand): Promise<CommandResult> {
    // For simulation, we just acknowledge the cancellation
    
    this.sendCommandResponse(command.response_url, {
      result: 'ACCEPTED',
      message: `Reservation ${command.reservation_id} cancelled`,
    });

    return {
      result: 'ACCEPTED',
      timeout: 30,
      message: `Cancelling reservation ${command.reservation_id}`,
    };
  }

  /**
   * Send async command response to eMSP
   */
  private async sendCommandResponse(responseUrl: string, result: { result: string; message?: string }): Promise<void> {
    if (!responseUrl) return;

    const startTime = Date.now();
    
    try {
      const response = await fetch(responseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          result: result.result,
          message: result.message,
          timestamp: new Date().toISOString(),
        }),
      });

      const responseBody = await response.json().catch(() => null);

      await logOutboundRequest({
        endpointType: 'commands',
        objectType: 'command_response',
        method: 'POST',
        url: responseUrl,
        requestBody: result,
        responseStatus: response.status,
        responseBody,
        success: response.ok,
        durationMs: Date.now() - startTime,
      });

    } catch (err: any) {
      await logOutboundRequest({
        endpointType: 'commands',
        objectType: 'command_response',
        method: 'POST',
        url: responseUrl,
        requestBody: result,
        success: false,
        error: err.message,
        durationMs: Date.now() - startTime,
      });
    }
  }
}

export const commandsService = new CommandsService();

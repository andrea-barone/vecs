/**
 * OCPI 2.2.1 Type Definitions
 * Based on https://github.com/ocpi/ocpi/blob/master/mod_locations.asciidoc
 */

export enum PartyRole {
  CPO = "CPO",
  EMSP = "EMSP",
  HUB = "HUB",
  SCSP = "SCSP",
  UNKNOWN = "UNKNOWN"
}

export interface Credentials {
  id: string;
  token: string;
  url: string;
  type: "GET_TOKEN" | "TOKEN";
  business_details: BusinessDetails;
  country_code: string;
  party_id: string;
  role: PartyRole;
  version: string;
  expires: Date;
}

export interface BusinessDetails {
  name: string;
  website?: string;
  logo?: Image;
}

// ============ LOCATION ============

export type LocationType = "ON_STREET" | "PARKING_GARAGE" | "PARKING_LOT" | "UNDERGROUND_GARAGE" | "ON_DRIVEWAY" | "OTHER";

export interface Location {
  country_code: string;           // ISO-3166 alpha-2
  party_id: string;               // ISO-15118 CPO ID
  id: string;                     // Unique within CPO
  publish: boolean;               // Whether to show on apps/websites
  publish_allowed_to?: PublishTokenType[];
  name?: string;
  address: string;
  city: string;
  postal_code?: string;
  state?: string;
  country: string;                // ISO 3166-1 alpha-3
  coordinates: GeoLocation;
  related_locations?: AdditionalGeoLocation[];
  parking_type?: ParkingType;
  evses?: EVSE[];
  directions?: DisplayText[];
  operator?: BusinessDetails;
  suboperator?: BusinessDetails;
  owner?: BusinessDetails;
  facilities?: Facility[];
  time_zone: string;              // IANA TZ, e.g. "Europe/Berlin"
  opening_times?: Hours;
  charging_when_closed?: boolean;
  images?: Image[];
  energy_mix?: EnergyMix;
  last_updated: Date;
}

export interface PublishTokenType {
  uid?: string;
  type?: TokenType;
  visual_number?: string;
  issuer?: string;
  group_id?: string;
}

export type ParkingType = "ALONG_MOTORWAY" | "PARKING_GARAGE" | "PARKING_LOT" | "ON_DRIVEWAY" | "ON_STREET" | "UNDERGROUND_GARAGE";

export type Facility = "HOTEL" | "RESTAURANT" | "CAFE" | "MALL" | "SUPERMARKET" | "SPORT" | "RECREATION_AREA" | "NATURE" | "MUSEUM" | "BIKE_SHARING" | "BUS_STOP" | "TAXI_STAND" | "TRAM_STOP" | "METRO_STATION" | "TRAIN_STATION" | "AIRPORT" | "PARKING_LOT" | "CARPOOL_PARKING" | "FUEL_STATION" | "WIFI";

export interface AdditionalGeoLocation {
  latitude: string;
  longitude: string;
  name?: DisplayText;
}

export interface Hours {
  twentyfourseven: boolean;
  regular_hours?: RegularHours[];
  exceptional_openings?: ExceptionalPeriod[];
  exceptional_closings?: ExceptionalPeriod[];
}

export interface RegularHours {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  period_begin: string;  // HH:MM
  period_end: string;    // HH:MM
}

export interface ExceptionalPeriod {
  period_begin: Date;
  period_end: Date;
}

// ============ EVSE ============

export type EVSEStatus = "AVAILABLE" | "BLOCKED" | "CHARGING" | "INOPERATIVE" | "OUTOFSERVICE" | "PLANNED" | "REMOVED";

export interface EVSE {
  uid: string;                    // Unique within CPO, max 36 chars
  evse_id?: string;               // eMI3/IDACS format, max 48 chars
  status: EVSEStatus;
  status_schedule?: StatusSchedule[];
  capabilities?: Capability[];
  connectors: Connector[];
  floor_level?: string;           // max 4 chars
  coordinates?: GeoLocation;
  physical_reference?: string;    // max 16 chars
  directions?: DisplayText[];
  parking_restrictions?: ParkingRestriction[];
  images?: Image[];
  last_updated: Date;
}

export interface StatusSchedule {
  period_begin: Date;
  period_end?: Date;
  status: EVSEStatus;
}

export type Capability = 
  | "CHARGING_PROFILE_CAPABLE"
  | "CHARGING_PREFERENCES_CAPABLE"
  | "CHIP_CARD_SUPPORT"
  | "CONTACTLESS_CARD_SUPPORT"
  | "CREDIT_CARD_PAYABLE"
  | "DEBIT_CARD_PAYABLE"
  | "PED_TERMINAL"
  | "REMOTE_START_STOP_CAPABLE"
  | "RESERVABLE"
  | "RFID_READER"
  | "START_SESSION_CONNECTOR_REQUIRED"
  | "TOKEN_GROUP_CAPABLE"
  | "UNLOCK_CAPABLE";

export type ParkingRestriction = "EV_ONLY" | "PLUGGED" | "DISABLED" | "CUSTOMERS" | "MOTORCYCLES";

// ============ CONNECTOR ============

export type ConnectorType = 
  | "CHADEMO" | "CHAOJI" | "DOMESTIC_A" | "DOMESTIC_B" | "DOMESTIC_C" | "DOMESTIC_D" 
  | "DOMESTIC_E" | "DOMESTIC_F" | "DOMESTIC_G" | "DOMESTIC_H" | "DOMESTIC_I" | "DOMESTIC_J" 
  | "DOMESTIC_K" | "DOMESTIC_L" | "DOMESTIC_M" | "DOMESTIC_N" | "DOMESTIC_O" 
  | "GB_T_AC" | "GB_T_DC" | "GBT_AC" | "GBT_DC"
  | "IEC_60309_2_single_16" | "IEC_60309_2_three_16" | "IEC_60309_2_three_32" | "IEC_60309_2_three_64"
  | "IEC_62196_T1" | "IEC_62196_T1_COMBO" | "IEC_62196_T2" | "IEC_62196_T2_COMBO" 
  | "IEC_62196_T3A" | "IEC_62196_T3C"
  | "NACS" | "PANTOGRAPH_BOTTOM_UP" | "PANTOGRAPH_TOP_DOWN"
  | "TESLA_R" | "TESLA_S";

export type ConnectorFormat = "SOCKET" | "CABLE";

export type PowerType = "AC_1_PHASE" | "AC_2_PHASE" | "AC_2_PHASE_SPLIT" | "AC_3_PHASE" | "DC";

export interface Connector {
  id: string;                     // Unique within EVSE, max 36 chars
  standard: ConnectorType;
  format: ConnectorFormat;
  power_type: PowerType;
  max_voltage: number;            // Line to neutral for AC_3_PHASE, in Volts
  max_amperage: number;           // In Amperes
  max_electric_power?: number;    // In Watts (when lower than voltage*amperage)
  tariff_ids?: string[];          // Currently valid tariff IDs
  terms_and_conditions?: string;  // URL
  last_updated: Date;
}

// ============ COMMON TYPES ============

export interface GeoLocation {
  latitude: string;  // Regex: -?[0-9]{1,2}\.[0-9]{5,7}
  longitude: string; // Regex: -?[0-9]{1,3}\.[0-9]{5,7}
}

export interface DisplayText {
  language: string;  // ISO 639-1
  text: string;
}

export interface Image {
  url: string;
  thumbnail?: string;
  category: "CHARGER" | "ENTRANCE" | "LOCATION" | "NETWORK" | "OPERATOR" | "OTHER" | "OWNER";
  type: string;      // MIME type
  width?: number;
  height?: number;
}

export interface EnergyMix {
  is_green_energy: boolean;
  energy_sources?: EnergySource[];
  environ_impact?: EnvironmentalImpact[];
  supplier_name?: string;
  energy_product_name?: string;
}

export interface EnergySource {
  source: "NUCLEAR" | "GENERAL_FOSSIL" | "COAL" | "GAS" | "GENERAL_GREEN" | "SOLAR" | "WIND" | "WATER";
  percentage: number;
}

export interface EnvironmentalImpact {
  category: "NUCLEAR_WASTE" | "CARBON_DIOXIDE";
  amount: number;
}

// ============ TARIFFS ============

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

export type TariffType = "AD_HOC_PAYMENT" | "PROFILE_CHEAP" | "PROFILE_FAST" | "PROFILE_GREEN" | "REGULAR";

export interface TariffElement {
  price_components: PriceComponent[];
  restrictions?: TariffRestrictions;
}

export interface PriceComponent {
  type: "ENERGY" | "FLAT" | "PARKING_TIME" | "TIME";
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
  reservation?: "RESERVATION" | "RESERVATION_EXPIRES";
}

export interface Price {
  excl_vat: number;
  incl_vat?: number;
}

// ============ TOKENS ============

export type TokenType = "AD_HOC_USER" | "APP_USER" | "OTHER" | "RFID";
export type WhitelistType = "ALWAYS" | "ALLOWED" | "ALLOWED_OFFLINE" | "NEVER";

export interface Token {
  country_code: string;
  party_id: string;
  uid: string;
  type: TokenType;
  contract_id: string;
  visual_number?: string;
  issuer: string;
  group_id?: string;
  valid: boolean;
  whitelist: WhitelistType;
  language?: string;
  default_profile_type?: ProfileType;
  energy_contract?: EnergyContract;
  last_updated: Date;
}

export type ProfileType = "CHEAP" | "FAST" | "GREEN" | "REGULAR";

export interface EnergyContract {
  supplier_name: string;
  contract_id?: string;
}

// ============ SESSIONS ============

export type SessionStatus = "ACTIVE" | "COMPLETED" | "INVALID" | "PENDING" | "RESERVATION";

export interface Session {
  country_code: string;
  party_id: string;
  id: string;
  start_date_time: Date;
  end_date_time?: Date;
  kwh: number;
  cdr_token: CdrToken;
  auth_method: AuthMethod;
  authorization_reference?: string;
  location_id: string;
  evse_uid: string;
  connector_id: string;
  meter_id?: string;
  currency: string;
  charging_periods?: ChargingPeriod[];
  total_cost?: Price;
  status: SessionStatus;
  last_updated: Date;
}

export interface CdrToken {
  country_code: string;
  party_id: string;
  uid: string;
  type: TokenType;
  contract_id: string;
}

export type AuthMethod = "AUTH_REQUEST" | "COMMAND" | "WHITELIST";

export interface ChargingPeriod {
  start_date_time: Date;
  dimensions: CdrDimension[];
  tariff_id?: string;
}

export interface CdrDimension {
  type: CdrDimensionType;
  volume: number;
}

export type CdrDimensionType = "CURRENT" | "ENERGY" | "ENERGY_EXPORT" | "ENERGY_IMPORT" | "MAX_CURRENT" | "MIN_CURRENT" | "MAX_POWER" | "MIN_POWER" | "PARKING_TIME" | "POWER" | "RESERVATION_TIME" | "STATE_OF_CHARGE" | "TIME";

// ============ CDRs ============

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

export interface CdrLocation {
  id: string;
  name?: string;
  address: string;
  city: string;
  postal_code?: string;
  state?: string;
  country: string;
  coordinates: GeoLocation;
  evse_uid: string;
  evse_id: string;
  connector_id: string;
  connector_standard: ConnectorType;
  connector_format: ConnectorFormat;
  connector_power_type: PowerType;
}

export interface SignedData {
  encoding_method: string;
  encoding_method_version?: number;
  public_key?: string;
  signed_values: SignedValue[];
  url?: string;
}

export interface SignedValue {
  nature: string;
  plain_data: string;
  signed_data: string;
}

// ============ COMMANDS ============

export type CommandType = "CANCEL_RESERVATION" | "RESERVE_NOW" | "START_SESSION" | "STOP_SESSION" | "UNLOCK_CONNECTOR";

export type CommandResponseType = "NOT_SUPPORTED" | "REJECTED" | "ACCEPTED" | "UNKNOWN_SESSION";

export type CommandResultType = "ACCEPTED" | "CANCELED_RESERVATION" | "EVSE_OCCUPIED" | "EVSE_INOPERATIVE" | "FAILED" | "NOT_SUPPORTED" | "REJECTED" | "TIMEOUT" | "UNKNOWN_RESERVATION";

// ============ RESPONSE ============

export interface OCPIResponse<T> {
  data?: T | T[];
  status_code: number;
  status_message: string;
  timestamp: Date;
}

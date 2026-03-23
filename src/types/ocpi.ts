/**
 * OCPI 2.2.1 Type Definitions
 */

export enum PartyRole {
  CPO = "CPO",
  EMSP = "EMSP",
  HUB = "HUB",
  SCSP = "SCSP",
  UNKOWN = "UNKNOWN"
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
  logo?: string;
}

export interface Location {
  id: string;
  type: "ON_STREET" | "PARKING_GARAGE" | "PARKING_LOT" | "OTHER";
  name?: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  coordinates: GeoLocation;
  evses: EVSE[];
  operator?: BusinessDetails;
  suboperator?: BusinessDetails;
  owner?: BusinessDetails;
  facilities?: ("CAFE" | "RESTAURANT" | "RESTROOM" | "SHOWER" | "MALL" | "SUPERMARKET")[];
  time_zone?: string;
  opening_times?: OpeningTimes;
  charging_when_closed?: boolean;
  images?: Image[];
  energymix?: EnergyMix;
  last_updated: Date;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface EVSE {
  uid: string;
  evse_id: string;
  status: "AVAILABLE" | "BLOCKED" | "CHARGING" | "INOPERATIVE" | "OUTOFSERVICE" | "PLANNED";
  status_schedule?: StatusSchedule[];
  connectors: Connector[];
  floor_level?: string;
  physical_reference?: string;
  directions?: DisplayText[];
  parking_restrictions?: ParkingRestriction[];
  images?: Image[];
  last_updated: Date;
}

export interface Connector {
  id: string;
  standard: "CHADEMO" | "CHAOJI" | "DOMESTIC_A" | "DOMESTIC_B" | "DOMESTIC_C" | "DOMESTIC_D" | "DOMESTIC_E" | "DOMESTIC_F" | "DOMESTIC_G" | "DOMESTIC_H" | "DOMESTIC_I" | "DOMESTIC_J" | "DOMESTIC_K" | "DOMESTIC_L" | "DOMESTIC_M" | "DOMESTIC_N" | "DOMESTIC_O" | "DOMESTIC_P" | "DOMESTIC_Q" | "DOMESTIC_R" | "DOMESTIC_S" | "DOMESTIC_T" | "DOMESTIC_U" | "DOMESTIC_V" | "DOMESTIC_W" | "DOMESTIC_X" | "DOMESTIC_Y" | "DOMESTIC_Z" | "GB_T" | "IEC_15118_2_CCS" | "IEC_62196_T1" | "IEC_62196_T1_COMBO" | "IEC_62196_T2" | "IEC_62196_T2_COMBO" | "IEC_62196_T3A" | "IEC_62196_T3C" | "NACS" | "NZS_TN_3112" | "TESLA_R" | "TESLA_S";
  format: "SOCKET" | "CABLE";
  power_type: "AC_1_PHASE" | "AC_3_PHASE" | "DC";
  voltage: number;
  amperage: number;
  power_kw?: number;
  status: "AVAILABLE" | "BLOCKED" | "CHARGING" | "INOPERATIVE" | "OUTOFSERVICE" | "PLANNED";
  status_schedule?: StatusSchedule[];
  images?: Image[];
  last_updated: Date;
}

export interface StatusSchedule {
  period_begin: Date;
  period_end?: Date;
  status: string;
}

export interface DisplayText {
  language: string;
  text: string;
}

export interface ParkingRestriction {
  time_period?: OpeningTime;
  max_vehicle_height_meters?: number;
  max_vehicle_length_meters?: number;
  max_vehicle_width_meters?: number;
  reserved_spot_numbers?: string[];
}

export interface Image {
  url: string;
  thumbnail?: string;
  category: "CHARGER" | "ENTRANCE" | "LOCATION" | "NETWORK" | "OPERATOR" | "OTHER" | "OWNER";
  type: string;
  width?: number;
  height?: number;
}

export interface OpeningTimes {
  twentyfourseven: boolean;
  regular_opening?: OpeningTime[];
  exceptional_openings?: ExceptionalPeriod[];
  exceptional_closings?: ExceptionalPeriod[];
}

export interface OpeningTime {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  period_begin: string;
  period_end: string;
}

export interface ExceptionalPeriod {
  period_begin: Date;
  period_end: Date;
}

export interface EnergyMix {
  is_green_energy: boolean;
  energy_sources: EnergySource[];
  environ_impact: EnvironmentalImpact[];
  supplier_name?: string;
  energy_product_name?: string;
}

export interface EnergySource {
  source: "NUCLEAR" | "GENERAL_FOSSIL" | "COAL" | "GAS" | "GENERAL_GREEN" | "SOLAR" | "WIND" | "WATER";
  percentage: number;
}

export interface EnvironmentalImpact {
  category: "EXHAUST_EMISSION" | "NUCLEAR_WASTE";
  amount: number;
}

export interface Tariff {
  id: string;
  currency: string;
  type: "AD_HOC_OFFER" | "PROFILE_CHEAP" | "PROFILE_FAST" | "REGULAR";
  display_text?: DisplayText[];
  start_date_time?: Date;
  end_date_time?: Date;
  last_updated: Date;
  elements: TariffElement[];
}

export interface TariffElement {
  price_components: PriceComponent[];
  restrictions?: TariffRestriction;
}

export interface PriceComponent {
  type: "ENERGY" | "PARKING_TIME" | "PARKING_PER_DAY" | "CHARGING_TIME";
  price: number;
  vat?: number;
  step_size?: number;
}

export interface TariffRestriction {
  start_time?: string;
  end_time?: string;
  start_date?: Date;
  end_date?: Date;
  min_kwh?: number;
  max_kwh?: number;
  min_current?: number;
  max_current?: number;
  min_power?: number;
  max_power?: number;
  min_duration?: number;
  max_duration?: number;
  day_of_week?: number[];
  reservation?: "RESERVABLE" | "RESERVATION_REQUIRED";
}

export interface Token {
  uid: string;
  type: "RFID" | "APP_USER";
  auth_id: string;
  visual_number?: string;
  issuer: string;
  valid: boolean;
  whitelist?: TokenWhiteListType;
  language?: string;
  last_updated: Date;
}

export type TokenWhiteListType = "ALWAYS" | "CHARGING" | "NEVER";

export interface Session {
  id: string;
  start_date_time: Date;
  end_date_time?: Date;
  kwh: number;
  auth_id: string;
  auth_method: "AUTH_REQUEST" | "WHITELIST";
  location_id: string;
  evse_uid: string;
  connector_id: string;
  currency: string;
  charging_periods: ChargingPeriod[];
  total_cost?: Price;
  status: "ACTIVE" | "COMPLETED" | "INVALID" | "PENDING";
  last_updated: Date;
}

export interface ChargingPeriod {
  start_date_time: Date;
  dimensions: ChargingDimension[];
  tariff_id?: string;
}

export interface ChargingDimension {
  type: "ENERGY" | "FLAT" | "MAX_CURRENT" | "MIN_CURRENT" | "PARKING_TIME" | "TIME";
  volume: number;
}

export interface Price {
  excl_vat: number;
  incl_vat?: number;
}

export interface CDR {
  id: string;
  start_date_time: Date;
  end_date_time: Date;
  auth_id: string;
  auth_method: "AUTH_REQUEST" | "WHITELIST";
  location: Location;
  evse_uid: string;
  connector_id: string;
  meter_id?: string;
  currency: string;
  tariffs: Tariff[];
  charging_periods: ChargingPeriod[];
  signed_data?: string;
  total_cost: Price;
  total_fixed_cost?: Price;
  total_energy: number;
  total_time: number;
  total_parking_time?: number;
  remark?: string;
  invoice_reference_id?: string;
  credit_reference_id?: string;
  credit: boolean;
  home_charging_compensation?: boolean;
  last_updated: Date;
}

export interface OCPIResponse<T> {
  data?: T | T[];
  status_code: number;
  status_message: string;
  timestamp: Date;
}

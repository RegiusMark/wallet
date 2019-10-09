export const APP_ACTION_REQ = 'APP_ACTION_REQ';
export const APP_ACTION_RES = 'APP_ACTION_RES';

export interface AppActionReq {
  id: number;
  req: ReqModel;
}

export interface AppActionRes {
  id: number;
  res: ResModel;
}

export type ReqModel = FirstSetupReq | LoadSettingsReq;
export type ResModel = FirstSetupRes | LoadSettingsRes;

export interface FirstSetupReq {
  type: 'settings:first_setup';
  password: string; // User chosen password
  privateKey: string; // Must be in WIF format
}

export interface FirstSetupRes {
  type: 'settings:first_setup';
}

export interface LoadSettingsReq {
  type: 'settings:load_settings';
  password: string;
}

export interface LoadSettingsRes {
  type: 'settings:load_settings';
  status: 'success' | 'incorrect_password' | 'invalid_checksum' | 'no_settings_available' | 'unknown';
}

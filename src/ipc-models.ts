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

export type ReqModel = FirstSetupReq | SettingsExistReq | LoadSettingsReq;
export type ResModel = FirstSetupRes | SettingsExistRes | LoadSettingsRes;

export interface FirstSetupReq {
  type: 'settings:first_setup';
  password: string; // User chosen password
  privateKey: string; // Must be in WIF format
}

export interface FirstSetupRes {
  type: 'settings:first_setup';
}

export interface SettingsExistReq {
  type: 'settings:does_exist';
}

export interface SettingsExistRes {
  type: 'settings:does_exist';
  exists: boolean;
}

export interface LoadSettingsReq {
  type: 'settings:load_settings';
  password: string;
}

export interface LoadSettingsRes {
  type: 'settings:load_settings';
  status: 'success' | 'incorrect_password' | 'no_settings_available' | 'unknown';
}

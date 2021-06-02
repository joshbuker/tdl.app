export interface SettingsStateInterface {
  sessionToken: string;
}

function state(): SettingsStateInterface {
  return {
    sessionToken: ''
  }
};

export default state;

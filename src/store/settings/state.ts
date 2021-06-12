export interface SettingsStateInterface {
  username: string;
}

function state(): SettingsStateInterface {
  return {
    username: ''
  }
};

export default state;

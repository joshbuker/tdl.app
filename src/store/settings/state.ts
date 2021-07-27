export interface SettingsStateInterface {
  username: string;
  selectedList: string;
}

function state(): SettingsStateInterface {
  return {
    username: '',
    selectedList: 'All Tasks'
  }
};

export default state;

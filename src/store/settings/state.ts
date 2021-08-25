export interface SettingsStateInterface {
  username: string;
  selectedList: string;
  selectedTags: array;
}

function state(): SettingsStateInterface {
  return {
    username: '',
    selectedList: 'All Tasks',
    selectedTags: []
  }
};

export default state;

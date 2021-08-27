export interface SettingsStateInterface {
  username: string;
  selectedList: string;
  selectedTags: array;
  allTagsFilter: boolean;
}

function state(): SettingsStateInterface {
  return {
    username: '',
    selectedList: 'All Tasks',
    selectedTags: [],
    allTagsFilter: true
  }
};

export default state;

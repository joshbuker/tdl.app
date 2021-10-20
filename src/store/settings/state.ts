import { TimeZone } from '../../components/models'

export interface SettingsStateInterface {
  username: string;
  timeZone: string;
  timeZones: Array<TimeZone>;
  selectedList: string;
  selectedTags: Array<string>;
  allTagsFilter: boolean;
}

function state(): SettingsStateInterface {
  return {
    username: '',
    timeZone: '',
    timeZones: [],
    selectedList: 'All Tasks',
    selectedTags: [],
    allTagsFilter: true
  }
};

export default state;

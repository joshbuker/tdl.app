import { MutationTree } from 'vuex';
import { SettingsStateInterface } from './state';

const mutation: MutationTree<SettingsStateInterface> = {
  setUsername(state, username: string) {
    state.username = username
  },

  setSelectedList(state, selectedList: string) {
    state.selectedList = selectedList
  },

  setSelectedTags(state, selectedTags: array) {
    state.selectedTags = selectedTags
  },

  toggleSelectedTag(state, title: string) {
    let index = state.selectedTags.indexOf(title);

    if (index === -1) {
      state.selectedTags.push(title);
    } else {
      state.selectedTags.splice(index, 1);
    }
  }
};

export default mutation;

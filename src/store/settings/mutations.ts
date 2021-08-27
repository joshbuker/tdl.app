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

  setAllTagsFilter(state, allTagsFilter: boolean) {
    state.allTagsFilter = allTagsFilter
  },

  clearTags(state) {
    state.selectedTags = []
  },

  toggleSelectedTag(state, title: string) {
    let index = state.selectedTags.indexOf(title);

    if (index === -1) {
      if (title === 'No Tags') {
        state.selectedTags = [title];
      } else {
        let noTagsIndex = state.selectedTags.indexOf('No Tags');
        if (noTagsIndex !== -1) {
          state.selectedTags.splice(noTagsIndex, 1);
        }
        state.selectedTags.push(title)
      }
    } else {
      state.selectedTags.splice(index, 1);
    }
  }
};

export default mutation;

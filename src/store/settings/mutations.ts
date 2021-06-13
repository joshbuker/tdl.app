import { MutationTree } from 'vuex';
import { SettingsStateInterface } from './state';

const mutation: MutationTree<SettingsStateInterface> = {
  setUsername(state, username: string) {
    state.username = username
  }
};

export default mutation;

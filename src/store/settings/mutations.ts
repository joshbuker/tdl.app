import { MutationTree } from 'vuex';
import { SettingsStateInterface } from './state';

const mutation: MutationTree<SettingsStateInterface> = {
  setSessionToken(state, sessionToken) {
    state.sessionToken = sessionToken
  }
};

export default mutation;

import { MutationTree } from 'vuex';
import { AuthenticationStateInterface } from './state';

const mutation: MutationTree<AuthenticationStateInterface> = {
  setSessionToken(state, sessionToken) {
    state.sessionToken = sessionToken
  }
};

export default mutation;

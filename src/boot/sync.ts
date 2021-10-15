import { boot } from 'quasar/wrappers';
import { errorNotification } from '../hackerman/ErrorNotification'
import { syncWithBackend } from '../hackerman/sync'

export default boot(({ store }) => {
  if (store.getters['authentication/loggedIn'] == true) {
    syncWithBackend(store)
  }
});

import { boot } from 'quasar/wrappers';
import { Notify } from 'quasar'

export default boot(({ store }) => {
  if (store.getters['authentication/loggedIn'] == true) {
    store.dispatch('settings/fetchUsername').
    catch(
      (error) => {
        let errorMessage = ''
        if (typeof error.response !== 'undefined') {
          errorMessage = error.response.data.error
        } else {
          errorMessage = `Failed to fetch username: ${error.message}`
        }
        Notify.create({
          color: 'negative',
          position: 'top',
          message: errorMessage,
          icon: 'report_problem'
        })
      }
    )
    store.dispatch('lists/fetchLists').
    catch(
      (error) => {
        let errorMessage = ''
        if (typeof error.response !== 'undefined') {
          errorMessage = error.response.data.error
        } else {
          errorMessage = `Failed to fetch lists: ${error.message}`
        }
        Notify.create({
          color: 'negative',
          position: 'top',
          message: errorMessage,
          icon: 'report_problem'
        })
      }
    )
    store.dispatch('tasks/fetchTasks').
    catch(
      (error) => {
        let errorMessage = ''
        if (typeof error.response !== 'undefined') {
          errorMessage = error.response.data.error
        } else {
          errorMessage = `Failed to fetch tasks: ${error.message}`
        }
        Notify.create({
          color: 'negative',
          position: 'top',
          message: errorMessage,
          icon: 'report_problem'
        })
      }
    )
  }
});

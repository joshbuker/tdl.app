import { boot } from 'quasar/wrappers';
import { Notify } from 'quasar'

export default boot(({ store }) => {
  console.log('kekw')
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
});

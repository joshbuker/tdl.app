import { errorNotification } from './ErrorNotification'

export function syncWithBackend(store: any) {
  store.dispatch('settings/fetchUsername').
  catch(
    (error: any) => {
      errorNotification(error, 'Failed to fetch username')
    }
  )
  store.dispatch('lists/fetchLists').
  catch(
    (error: any) => {
      errorNotification(error, 'Failed to fetch lists')
    }
  )
  store.dispatch('tags/fetchTags').
  catch(
    (error: any) => {
      errorNotification(error, 'Failed to fetch tags')
    }
  )
  store.dispatch('tasks/fetchTasks').
  catch(
    (error: any) => {
      errorNotification(error, 'Failed to fetch tasks')
    }
  )
}

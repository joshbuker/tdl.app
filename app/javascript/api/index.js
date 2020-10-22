import lists from './modules/lists.js.erb'
import logout from './modules/logout.js.erb'
import settings from './modules/settings.js.erb'
import tags from './modules/tags.js.erb'
import tasks from './modules/tasks.js.erb'

export default {
  ...lists,
  ...logout,
  ...settings,
  ...tags,
  ...tasks
}

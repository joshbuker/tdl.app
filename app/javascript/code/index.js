import addPostDialog from './modules/add_post_dialog'
import addPreDialog from './modules/add_pre_dialog'
import createTaskDialog from './modules/create_task_dialog'
import currentTaskDialog from './modules/current_task_dialog'
import editListDialog from './modules/edit_list_dialog'
import editTagDialog from './modules/edit_tag_dialog'
import logout from './modules/logout'
import notifications from './modules/notifications.js.erb'
import ordering from './modules/ordering'
import reviewDialog from './modules/review_dialog'
import treeView from './modules/tree_view'

export default {
  data: {
    ...addPostDialog.data,
    ...addPreDialog.data,
    ...createTaskDialog.data,
    ...currentTaskDialog.data,
    ...editListDialog.data,
    ...editTagDialog.data,
    // No data for: logout
    // No data for: notifications
    // No data for: ordering
    ...reviewDialog.data,
    ...treeView.data
  },
  computed: {
    // No computed for: addPostDialog
    // No computed for: addPreDialog
    // No computed for: createTaskDialog
    // No computed for: currentTaskDialog
    // No computed for: editListDialog
    // No computed for: editTagDialog
    // No computed for: logout
    // No computed for: notifications
    // No computed for: ordering
    ...reviewDialog.computed,
    ...treeView.computed
  },
  methods: {
    ...addPostDialog.methods,
    ...addPreDialog.methods,
    ...createTaskDialog.methods,
    ...currentTaskDialog.methods,
    ...editListDialog.methods,
    ...editTagDialog.methods,
    ...logout.methods,
    ...notifications.methods,
    ...ordering.methods,
    ...reviewDialog.methods,
    ...treeView.methods
  }
}

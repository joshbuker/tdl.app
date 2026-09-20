import toastr from 'toastr'
import api from '../../api'

const data = {
  treeActive: []
}

const computed = {
  treeSelected() {
    if(!this.treeActive.length) return undefined;
    if(!this.treeTasks.length) return undefined;

    const title = this.treeActive[0];

    return this.findTreeTask(this.treeTasks, title);
  }
}

const methods = {
  findTreeTask(items, title) {
    if(!items) return;

    for(const item of items) {
      if(item.title === title) return item;

      const child = this.findTreeTask(item.postreqs, title);
      if(child) {
        return child;
      }
    }
  },
  // TODO: Convert to vuex action?
  async loadPostreqs(task) {
    return api.fetchTreePostreqs(
      { id: task.id },
      (response) => {
        task.postreqs = response.data;
      },
      (error) => {
        toastr.error(error.message);
      }
    );
  }
}

export default {
  data,
  computed,
  methods
}

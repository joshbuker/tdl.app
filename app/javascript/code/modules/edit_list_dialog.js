import toastr from 'toastr'

const data = {
  editListDialog: false,
  editListTitle: '',
  listToBeEdited: {}
}

const methods = {
  editList(list) {
    this.editListDialog = true;
    this.listToBeEdited = list;
    this.editListTitle = this.listToBeEdited.title;
  },
  resetListEdit() {
    this.editListDialog = false;
    this.listToBeEdited = { title: 'Placeholder' };
    this.editListTitle = '';
  },
  updateList() {
    const previousListTitle = this.listToBeEdited.title;
    this.$store.dispatch('lists/update', {
      id: this.listToBeEdited.id,
      title: this.editListTitle
    }).
    then(
      (response) => {
        if(previousListTitle == this.selectedList) {
          this.selectedList = this.editListTitle;
        }
        this.refreshTasks();
        this.resetListEdit();
        toastr.success('Updated list!');
      },
      (error) => {
        toastr.error(error.message);
      }
    );
  }
}

export default {
  data,
  methods
}

import toastr from 'toastr'

const data = {
  editTagDialog: false,
  editTagColor: '',
  editTagTitle: '',
  tagToBeEdited: {}
}

const methods = {
  editTag(tag) {
    this.editTagDialog = true;
    this.tagToBeEdited = tag;
    this.editTagColor = this.tagToBeEdited.color;
    this.editTagTitle = this.tagToBeEdited.title;
  },
  resetTagEdit() {
    this.editTagDialog = false;
    this.tagToBeEdited = {
      title: 'Placeholder',
      color: '#000000'
    };
    this.editTagTitle = '';
    this.editTagColor = '#000000';
  },
  textColor(backgroundColor) {
    // Javascript seems to hate guard clauses like I hate javascript
    if(!backgroundColor || 0 === backgroundColor.length) {
      return '#000000';
    } else {
      let input = backgroundColor.toString().replace('#', '');
      if(input.length != 6) {
        return '#000000';
      } else {
        let red = parseInt(input.substr(0,2), 16);
        let green = parseInt(input.substr(2,2), 16);
        let blue = parseInt(input.substr(4,2), 16);
        // Luminance values for different hues are not equal.
        let greyscale = red * 0.299 + green * 0.587 + blue * 0.114;
        // Perceived midpoint for grey is higher than 128. (around 186)
        let midpoint = 152;
        return (greyscale > midpoint) ? '#000000' : '#ffffff';
      }
    }
  },
  updateTag() {
    const previousTagTitle = this.tagToBeEdited.title;
    this.$store.dispatch('tags/update', {
      id: this.tagToBeEdited.id,
      title: this.editTagTitle,
      color: this.editTagColor
    }).
    then(
      (response) => {
        if(this.selectedTags.includes(previousTagTitle)) {
          const index = this.selectedTags.findIndex(this.editTagTitle);
          this.selectedTags.splice(index, 1, this.editTagTitle);
        }
        this.refreshTasks();
        this.resetTagEdit();
        toastr.success('Updated tag!');
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

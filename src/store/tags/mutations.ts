import { MutationTree } from 'vuex';
import { TagsStateInterface } from './state';

function sortTags(state) {
  // Sort via order first, then alphabetically
  state.tags = state.tags.sort((a, b) => {
    if (a.order < b.order) {
      return -1
    } else if (a.order > b.order) {
      return 1
    } else {
      // TODO: Pass in user locale to this?
      return a.title.localeCompare(b.title)
    }
  })
}

const mutation: MutationTree<TagsStateInterface> = {
  addTag(state, tag: Tag) {
    state.tags.push(tag)
    // Rather than trying to insert it in the right spot, just add it to the end
    // and resort. Maybe change later?
    sortTags(state)
  },

  setTags(state, tags: Array) {
    state.tags = tags
  },

  updateTag(state, tag: Tag) {
    const index = state.tags.findIndex(
      (element) => { return (element.id == tag.id) }
    )
    state.tags.splice(index, 1, tag)
    // Resort because title change might affect ordering
    sortTags(state)
  },

  removeTag(state, id: Integer) {
    const index = state.tags.findIndex(
      (element) => { return (element.id == id) }
    )
    state.tags.splice(index, 1)
  }
};

export default mutation;

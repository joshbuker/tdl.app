import { GetterTree } from 'vuex';
import { StateInterface } from '../index';
import { TagsStateInterface } from './state';

const getters: GetterTree<TagsStateInterface, StateInterface> = {
  tags (state) {
    return state.tags;
  },
  tagsOrdering (state) {
    return state.tags.map((element, index, array) => {
      return { id: element.id, order: index }
    })
  },
  nextOrder (state) {
    if (state.tags.length < 1) return undefined;
    return (state.tags[state.tags.length - 1].order + 1);
  }
};

export default getters;

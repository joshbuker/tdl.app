export interface TagsStateInterface {
  tags: array;
}

function state(): TagsStateInterface {
  return {
    tags: []
  }
};

export default state;

export interface TagsStateInterface {
  tags: Array<any>;
}

function state(): TagsStateInterface {
  return {
    tags: []
  }
};

export default state;

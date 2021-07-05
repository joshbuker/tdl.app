export interface ListsStateInterface {
  lists: array;
}

function state(): ListsStateInterface {
  return {
    lists: []
  }
};

export default state;

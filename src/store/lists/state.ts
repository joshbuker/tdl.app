export interface ListsStateInterface {
  lists: Array<any>;
}

function state(): ListsStateInterface {
  return {
    lists: []
  }
};

export default state;

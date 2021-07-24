export interface TasksStateInterface {
  tasks: array;
}

function state(): TasksStateInterface {
  return {
    tasks: []
  }
};

export default state;

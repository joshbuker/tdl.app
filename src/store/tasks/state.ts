export interface TasksStateInterface {
  tasks: Array<any>;
}

function state(): TasksStateInterface {
  return {
    tasks: []
  }
};

export default state;

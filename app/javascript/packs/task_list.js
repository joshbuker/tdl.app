import Vue from 'vue/dist/vue.esm'
import App from '../app.vue'

// import 'bootstrap'
// import 'font-awesome/fonts'
import toastr from 'toastr'
import '../stylesheets/bootstrap'
import '../stylesheets/font-awesome'
import '../stylesheets/toastr'

document.addEventListener('DOMContentLoaded', () => {
  const app = new Vue({
    el:'#appRoot',
    data:{
      title:{
        taskList: 'Task List',
        completedTasks: 'Completed Tasks'
      },
      tasks: [
        { description: "Take out trash", completed: false },
        { description: "Read newspaper", completed: false },
        { description: "Practice guitar", completed: false },
        { description: "Do the dishes", completed: false },
        { description: "Walk the dog", completed: false },
        { description: "Clean the bathroom", completed: true },
      ],
      editTaskIndex: -1
    },
    methods:{
      addTask(){
        this.tasks.push({description: this.$refs.newTask.value , completed: false});
        this.$refs.newTask.value = '';

        toastr.success('New task added to the task list !!!')
      },

      deleteTask(index){
        this.tasks.splice(index,1);
        toastr.error('Task deleted');
        console.log(toastr);
      },
      edited(){
        toastr.success('Task updated !!!')
      }
    },
    computed: {
      // incompleteTasks: function(){
      //  return this.tasks.filter( rayhan =>  !rayhan.completed );
      // },
      completeTasks: function(){
        return this.tasks.filter( task =>  task.completed );
      }
    }
  })
})

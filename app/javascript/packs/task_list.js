import Vue from 'vue/dist/vue.esm'
import App from '../app.vue'

// import 'bootstrap'
// import 'font-awesome/fonts'
import toastr from 'toastr'
import axios from 'axios'
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
      tasks: [],
      editTaskIndex: -1
    },
    methods:{
      addTask(){
        axios.post('http://localhost:3000/tasks', {
          title: this.$refs.newTask.value
        }).
        then(response => {
          this.tasks.push(response.data);
          this.$refs.newTask.value = '';
          toastr.success('Added new task!');
        }).
        catch(e => {
          toastr.error(e.message)
        });
      },
      deleteTask(index){
        axios.delete('http://localhost:3000/tasks/' + String(this.tasks[index].id)).
        then(response => {
          this.tasks.splice(index,1);
          toastr.success('Task deleted!');
        }).
        catch(e => {
          toastr.error(e.message)
        })
      },
      edited(index){
        axios.put('http://localhost:3000/tasks/' + String(this.tasks[index].id), {
          title: this.tasks[index].title
        }).
        then(response => {
          toastr.success('Task updated!')
        }).
        catch(e => {
          toastr.error(e.message)
        });
      },
      taskCompleted(index){
        toastr.success('Completed task!')
      },
      taskUndoCompleted(index){
        toastr.success('Undid task completion!')
      }
    },
    computed: {
      completeTasks: function(){
        return this.tasks.filter(task =>  task.completed);
      }
    },
    created: function() {
      axios.get('http://localhost:3000/tasks').
      then(response => {
        this.tasks = response.data;
      }).
      catch(e => {
        toastr.error(e.message);
      });
    }
  })
})

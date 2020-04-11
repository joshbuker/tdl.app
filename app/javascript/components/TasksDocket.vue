<template>
  <div class="tasks-docket">
    <h3>{{ title }}</h3>
    <hr>
    <ul>
      <li v-for="task in tasks">
        {{ task.title }}
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  props: {
    tasks: Array,
    title: String
  }
};
</script>

<style>
.tasks-docket {
  background-color: rgba(255,255,255,0.5) !important;
  border-radius: 10px;
}
.tasks-docket > h3 {
  text-align: center;
  margin-top: 8px;
}
</style>

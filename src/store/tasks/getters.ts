import { DateTime } from 'luxon'
import { GetterTree } from 'vuex';
import { StateInterface } from '../index';
import { TasksStateInterface } from './state';
import Task from '../../models/task'

const getters: GetterTree<TasksStateInterface, StateInterface> = {
  tasks (state) {
    return state.tasks;
  },

  allTasksCount: (state, getters) => (store) => {
    return getters.nextUp(store, 'All Tasks').length;
  },

  tasks: (state) => (store, selectedList) => {
    return store.$repo(Task).
      with('list').with('prereqs').with('postreqs').with('tags').get().
    filter(
      (task) => {
        if(selectedList === 'All Tasks') {
          return true;
        } else if (selectedList !== undefined && task.list !== undefined) {
          return task.list.title === selectedList;
        } else {
          return false;
        }
      }
    )
  },

  nextUp: (state, getters) => (store, selectedList) => {
    return getters.tasks(store, selectedList).
    filter(
      (task) => {
        return task.completed_at == null
      }
    ).filter(
      (task) => {
        return !task.prereqs.some(
          (prereq) => { return prereq.completed_at == null }
        )
      }
    )
  },

  today: (state, getters) => (store, selectedList) => {
    const endOfDay = DateTime.local().endOf('day').toMillis();

    return getters.nextUp(store, selectedList).filter(
      (task) => { return (
        task.review_at == null ||
        DateTime.fromISO(task.review_at).toMillis() <= endOfDay
      )}
    )
  },

  tomorrow: (state, getters) => (store, selectedList) => {
    const tomorrow = DateTime.local().plus({ days: 1 });
    const startOfTomorrow = tomorrow.startOf('day').toMillis();
    const endOfTomorrow = tomorrow.endOf('day').toMillis();

    return getters.nextUp(store, selectedList).filter(
      (task) => {
        if(task.review_at != null) {
          return (
            DateTime.fromISO(task.review_at).toMillis() >= startOfTomorrow &&
            DateTime.fromISO(task.review_at).toMillis() <= endOfTomorrow
          )
        } else {
          return false;
        }
      }
    )
  },

  upcoming: (state, getters) => (store, selectedList) => {
    const startOfUpcoming = DateTime.local().plus({ days: 2 }).startOf('day').toMillis();
    const endOfUpcoming = DateTime.local().plus({ days: 31 }).endOf('day').toMillis();

    return getters.nextUp(store, selectedList).filter(
      (task) => {
        if(task.review_at != null) {
          return (
            DateTime.fromISO(task.review_at).toMillis() >= startOfUpcoming &&
            DateTime.fromISO(task.review_at).toMillis() <= endOfUpcoming
          )
        } else {
          return false;
        }
      }
    );
  },

  someday: (state, getters) => (store, selectedList) => {
    const endOfUpcoming = DateTime.local().plus({ days: 31 }).endOf('day').toMillis();

    return getters.nextUp(store, selectedList).filter(
      (task) => {
        if(task.review_at != null) {
          return (
            DateTime.fromISO(task.review_at).toMillis() > endOfUpcoming
          )
        } else {
          return false;
        }
      }
    );
  },
};

export default getters;

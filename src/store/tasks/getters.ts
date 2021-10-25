import { DateTime } from 'luxon'
import { Store as VuexStore, GetterTree } from 'vuex';
import { StateInterface } from '../index';
import { TasksStateInterface } from './state';
import Task from '../../models/task'
import {
  Task as TaskInterface,
  Tag as TagInterface,
  List as ListInterface
} from '../../components/models'

const getters: GetterTree<TasksStateInterface, StateInterface> = {
  allTasksCount: (state, getters) => (store: VuexStore<StateInterface>) => {
    return getters.nextUp(store, 'All Tasks', null).length;
  },

  listTasks: (state) => (store: any, selectedList: string): Array<TaskInterface> => {
    return store.$repo(Task).
      with('list').
      with('prereqs', (query) => { query.with('tags') }).
      with('postreqs', (query) => { query.with('tags') }).
      with('tags').
      get().
    filter(
      (task: TaskInterface) => {
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

  tasks: (state, getters) => (store: VuexStore<StateInterface>, selectedList: string, selectedTags: Array<string>, allTagsFilter: boolean): Array<TaskInterface> => {
    if (selectedTags == null || Array.isArray(selectedTags) !== true || selectedTags.length == 0) {
      return getters.listTasks(store, selectedList);
    } else if (selectedTags.includes('No Tags') === true) {
      return getters.listTasks(store, selectedList).filter(
        (task: TaskInterface) => { return (
          task.tags == null ||
          (
            Array.isArray(task.tags) &&
            task.tags.length == 0
          )
        )}
      )
    } else {
      return getters.listTasks(store, selectedList).filter(
        // For every task in the list
        (task: TaskInterface) => {
          if(allTagsFilter === true) {
            return (
              // For every tag we're limiting by
              selectedTags.every(
                (tag) => { return (
                  // Ensure that the task includes said tag
                  task.tags.some(
                    (task_tag) => { return (
                      task_tag.title == tag
                    )}
                  )
                )}
              )
            )
          // Otherwise match if it has ANY tag that matches
          } else {
            return (
              selectedTags.some(
                (tag) => { return (
                  task.tags.some(
                    (task_tag: TagInterface) => { return (
                      task_tag.title == tag
                    )}
                  )
                )}
              )
            )
          }
        }
      )
    }
  },

  nextUp: (state, getters) => (store: VuexStore<StateInterface>, selectedList: string, selectedTags: Array<string>, allTagsFilter: boolean): Array<TaskInterface> => {
    return getters.tasks(store, selectedList, selectedTags, allTagsFilter).
    filter(
      (task: TaskInterface) => {
        return task.completed_at == null
      }
    ).filter(
      (task: TaskInterface) => {
        return !task.prereqs.some(
          (prereq: TaskInterface) => { return prereq.completed_at == null }
        )
      }
    )
  },

  today: (state, getters) => (store: VuexStore<StateInterface>, selectedList: string, selectedTags: Array<string>, allTagsFilter: boolean): Array<TaskInterface> => {
    const endOfDay = DateTime.local().endOf('day').toMillis();

    return getters.nextUp(store, selectedList, selectedTags, allTagsFilter).filter(
      (task: TaskInterface) => { return (
        task.review_at == null ||
        DateTime.fromISO(task.review_at).toMillis() <= endOfDay
      )}
    )
  },

  tomorrow: (state, getters) => (store: VuexStore<StateInterface>, selectedList: string, selectedTags: Array<string>, allTagsFilter: boolean): Array<TaskInterface> => {
    const tomorrow = DateTime.local().plus({ days: 1 });
    const startOfTomorrow = tomorrow.startOf('day').toMillis();
    const endOfTomorrow = tomorrow.endOf('day').toMillis();

    return getters.nextUp(store, selectedList, selectedTags, allTagsFilter).filter(
      (task: TaskInterface) => {
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

  upcoming: (state, getters) => (store: VuexStore<StateInterface>, selectedList: string, selectedTags: Array<string>, allTagsFilter: boolean): Array<TaskInterface> => {
    const startOfUpcoming = DateTime.local().plus({ days: 2 }).startOf('day').toMillis();
    const endOfUpcoming = DateTime.local().plus({ days: 31 }).endOf('day').toMillis();

    return getters.nextUp(store, selectedList, selectedTags, allTagsFilter).filter(
      (task: TaskInterface) => {
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

  someday: (state, getters) => (store: VuexStore<StateInterface>, selectedList: string, selectedTags: Array<string>, allTagsFilter: boolean): Array<TaskInterface> => {
    const endOfUpcoming = DateTime.local().plus({ days: 31 }).endOf('day').toMillis();

    return getters.nextUp(store, selectedList, selectedTags, allTagsFilter).filter(
      (task: TaskInterface) => {
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

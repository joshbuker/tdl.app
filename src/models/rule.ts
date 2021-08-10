import { Model } from '@vuex-orm/core'
import Task from './task'

export default class Rule extends Model {
  static entity = 'rules'

  static fields () {
    return {
      id: this.attr(null),
      pre_id: this.attr(null),
      post_id: this.attr(null),
      pre: this.belongsTo(Task, 'pre_id'),
      post: this.belongsTo(Task, 'post_id')
    }
  }
}

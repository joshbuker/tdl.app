import { Model } from '@vuex-orm/core'

export default class Task extends Model {
  static entity = 'tasks'

  static fields () {
    return {
      id: this.attr(null),
      list_id: this.attr(null),
      title: this.attr(''),
      order: this.attr(0),
      notes: this.attr(''),
      completed_at: this.attr(''),
      deadline_at: this.attr(''),
      prioritize_at: this.attr(''),
      remind_me_at: this.attr(''),
      review_at: this.attr('')
    }
  }
}

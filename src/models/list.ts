import { Model } from '@vuex-orm/core'

export default class List extends Model {
  static entity = 'lists'

  static fields () {
    return {
      id: this.attr(null),
      title: this.attr(''),
      order: this.attr(0)
    }
  }
}

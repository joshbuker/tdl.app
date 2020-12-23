import toastr from 'toastr'

const methods = {
  syncListOrdering() {
    this.$store.dispatch('lists/syncOrdering').
    catch(
      (error) => {
        toastr.error(error.message);
      }
    );
  },
  syncTagOrdering() {
    this.$store.dispatch('tags/syncOrdering').
    catch(
      (error) => {
        toastr.error(error.message);
      }
    );
  },
  // FIXME: How do with Vuex?
  syncTaskOrdering() {
  //   var lists = [this.today, this.tomorrow, this.upcoming, this.someday];
  //   for(var list of lists) {
  //     for(var task of list) {
  //       var current_order = list.indexOf(task) + 1;
  //       // TODO: Handle ordering tagless tasks
  //       if(this.limiterType == 'tag') {
  //         var tag_order = task.tag_ordering.find( ({ title }) => title == this.limiterValue ).order;
  //         if(current_order != tag_order) {
  //           axios.patch('task_url_here/' + String(task.id) + '/order', {
  //             tag_title: this.limiterValue,
  //             order: current_order,
  //             credentials: 'same-origin',
  //             'X-CSRF-Token': token,
  //             'authenticity_token': token
  //           }).
  //           then(response => {
  //             toastr.success('Ordering updated');
  //           }).
  //           catch(e => {
  //             toastr.error(e.message);
  //           });
  //         }
  //       } else {
  //         if(current_order != task.order) {
  //           axios.patch('task_url_here/' + String(task.id) + '/order', {
  //             order: current_order,
  //             credentials: 'same-origin',
  //             'X-CSRF-Token': token,
  //             'authenticity_token': token
  //           }).
  //           then(response => {
  //             toastr.success('Ordering updated');
  //           }).
  //           catch(e => {
  //             toastr.error(e.message);
  //           });
  //         }
  //       }
  //     }
  //   }
  }
}

export default {
  methods
}

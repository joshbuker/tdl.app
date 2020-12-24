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
  moveTask(event, list, listname) {
    // console.log('moveTask', event, list, listname);
    if(event.hasOwnProperty('moved')) {
      this.$store.dispatch('tasks/moveTask', {
        event: event,
        list: list
      }).
      catch(
        (error) => {
          toastr.error(error.message);
        }
      );
    }
    else if(event.hasOwnProperty('added')) {
      this.$store.dispatch('tasks/moveTaskColumn', {
        event: event,
        list: list,
        time: listname
      }).
      catch(
        (error) => {
          toastr.error(error.message);
        }
      );
    }
  }
}

export default {
  methods
}

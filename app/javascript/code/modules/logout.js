import toastr from 'toastr'
import api from '../../api'

const methods = {
  logout() {
    api.logout(
      (response) => {
        window.location.reload();
      },
      (error) => {
        toastr.error(error.message);
      }
    )
  }
}

export default {
  methods
}

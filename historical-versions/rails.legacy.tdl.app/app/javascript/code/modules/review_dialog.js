import toastr from 'toastr'
import api from '../../api'

const data = {
  reviewButtons: 'root',
  reviewDialog: false,
  reviewQueue: [],
  reviewWaiting: false
}

const computed = {
  currentReviewTask() {
    if(this.reviewQueue.length == 0) return undefined;

    return this.reviewQueue[0];
  }
}

const methods = {
  beginTaskReview() {
    // Duplicate today array
    this.reviewQueue = JSON.parse(JSON.stringify(this.today));
    if(this.reviewQueue.length > 0) {
      this.reviewButtons = 'root';
      this.reviewDialog = true;
    } else {
      toastr.warning('No tasks to review!');
    }
  },
  endReview() {
    this.reviewButtons = 'root';
    this.reviewDialog = false;
    this.reviewQueue = [];
    this.refreshEverything();
  },
  reviewNext() {
    this.reviewQueue.shift();
    this.reviewButtons = 'root';
    if(this.reviewQueue.length == 0) {
      this.endReview();
    }
  },
  reviewDone() {
    this.reviewWaiting = true;
    api.markTaskComplete(
      { id: this.currentReviewTask.id },
      (response) => {
        this.reviewWaiting = false;
        this.reviewNext();
      },
      (error) => {
        this.reviewWaiting = false;
        toastr.error(error.message);
      }
    )
  },
  reviewDelete() {
    toastr.warning('haha, no.');
  },
  reviewToday() {
    this.reviewNext();
  },
  reviewTomorrow() {
    this.reviewWaiting = true;
    api.updateTaskReviewAt(
      {
        id: this.currentReviewTask.id,
        review_at: 'tomorrow'
      },
      (response) => {
        this.reviewWaiting = false;
        this.reviewNext();
      },
      (error) => {
        this.reviewWaiting = false;
        toastr.error(error.message);
      }
    )
  },
  reviewNextWeek() {
    this.reviewWaiting = true;
    api.updateTaskReviewAt(
      {
        id: this.currentReviewTask.id,
        review_at: 'next week'
      },
      (response) => {
        this.reviewWaiting = false;
        this.reviewNext();
      },
      (error) => {
        this.reviewWaiting = false;
        toastr.error(error.message);
      }
    )
  },
  reviewUpcoming() {
    this.reviewWaiting = true;
    api.updateTaskReviewAt(
      {
        id: this.currentReviewTask.id,
        review_at: 'upcoming'
      },
      (response) => {
        this.reviewWaiting = false;
        this.reviewNext();
      },
      (error) => {
        this.reviewWaiting = false;
        toastr.error(error.message);
      }
    )
  },
  reviewSomeday() {
    this.reviewWaiting = true;
    api.updateTaskReviewAt(
      {
        id: this.currentReviewTask.id,
        review_at: 'someday'
      },
      (response) => {
        this.reviewWaiting = false;
        this.reviewNext();
      },
      (error) => {
        this.reviewWaiting = false;
        toastr.error(error.message);
      }
    )
  },
}

export default {
  data,
  computed,
  methods
}

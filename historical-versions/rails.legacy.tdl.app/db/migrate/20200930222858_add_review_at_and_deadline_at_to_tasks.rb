class AddReviewAtAndDeadlineAtToTasks < ActiveRecord::Migration[6.0]
  def change
    add_column :tasks, :review_at, :datetime
    add_column :tasks, :deadline_at, :datetime
  end
end

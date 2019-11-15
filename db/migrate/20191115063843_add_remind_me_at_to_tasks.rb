class AddRemindMeAtToTasks < ActiveRecord::Migration[6.0]
  def change
    add_column :tasks, :remind_me_at, :datetime
  end
end

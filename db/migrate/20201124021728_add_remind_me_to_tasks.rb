class AddRemindMeToTasks < ActiveRecord::Migration[6.0]
  def change
    add_column :tasks, :remind_me, :boolean,
      null: false,
      default: false

    remove_column :tasks, :remind_me_at
  end
end

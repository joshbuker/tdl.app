class RemoveTitleIndex < ActiveRecord::Migration[6.0]
  def change
    remove_index :tasks, :title
    remove_index :lists, :title
  end
end

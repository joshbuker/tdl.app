class AddOrdering < ActiveRecord::Migration[6.0]
  def change
    add_column :tasks,    :order, :integer, null: false, default: 0
    add_column :taggings, :order, :integer, null: false, default: 0
  end
end

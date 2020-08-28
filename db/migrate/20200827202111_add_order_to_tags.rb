class AddOrderToTags < ActiveRecord::Migration[6.0]
  def change
    add_column :tags, :order, :integer, null: false, default: 0
  end
end

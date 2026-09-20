class AddTimezoneToUsers < ActiveRecord::Migration[6.0]
  def change
    add_column :users, :timezone, :string,
      null: false,
      default: 'UTC'
  end
end

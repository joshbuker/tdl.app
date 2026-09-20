class AddRememberMeToUser < ActiveRecord::Migration[6.0]
  def change
    add_column :users, :remember_me_token, :string
    add_column :users, :remember_me_token_expires_at, :datetime
  end
end

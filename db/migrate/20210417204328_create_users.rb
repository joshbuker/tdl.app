class CreateUsers < ActiveRecord::Migration[6.1]
  def change
    create_table :users do |t|
      # Name
      t.string :given_name,  null: false
      t.string :family_name, null: false
      # Preferences
      t.string :time_zone, null: false, default: 'UTC'
      t.string :locale,    null: false, default: 'en'
      # Account information
      t.string :username, null: false
      t.string :email,    null: false
      # Password (argon2 hash)
      t.string :password_digest
      # Track the last time a user accepted the terms
      t.datetime :terms_and_conditions, null: false

      t.timestamps
    end
  end
end

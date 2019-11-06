class CreateUsers < ActiveRecord::Migration[6.0]
  def change
    create_table :users do |t|
      t.string :username,    null: false
      t.string :given_name,  null: false
      t.string :family_name, null: false
      t.string :email,       null: false

      t.timestamps
    end

    add_index :users, :username, unique: true
  end
end

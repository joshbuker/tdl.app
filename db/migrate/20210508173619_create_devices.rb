class CreateDevices < ActiveRecord::Migration[6.1]
  def change
    create_table :devices do |t|
      t.belongs_to :user, null: false, foreign_key: true
      t.string :user_agent

      t.timestamps
    end
  end
end

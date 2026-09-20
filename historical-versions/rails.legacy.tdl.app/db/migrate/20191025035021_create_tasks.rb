class CreateTasks < ActiveRecord::Migration[6.0]
  def change
    create_table :tasks do |t|
      t.string :title, null: false

      t.timestamps
    end

    add_index :tasks, :title, unique: true
  end
end

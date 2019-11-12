class CreateTags < ActiveRecord::Migration[6.0]
  def change
    create_table :tags do |t|
      t.belongs_to :user, null: false, foreign_key: true
      t.string :title,    null: false
      t.string :color,    null: false

      t.timestamps
    end
  end
end

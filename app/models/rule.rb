class Rule < ApplicationRecord
  belongs_to :pre,
    class_name: 'Task',
    foreign_key: :pre_id
  belongs_to :post,
    class_name: 'Task',
    foreign_key: :post_id

  validates :pre, uniqueness: { scope: :post_id }
  validates :post, uniqueness: { scope: :pre_id }
end

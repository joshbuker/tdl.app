class Rule < ApplicationRecord
  belongs_to :pre,
    class_name: 'Task',
    inverse_of: :post_rules
  belongs_to :post,
    class_name: 'Task',
    inverse_of: :pre_rules

  validates :pre, uniqueness: { scope: :post_id }
  validates :post, uniqueness: { scope: :pre_id }
end

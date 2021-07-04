class Task < ApplicationRecord
  belongs_to :list
  belongs_to :user

  has_many :taggings,
    dependent: :destroy

  has_many :pre_rules,
    class_name:  'Rule',
    inverse_of:  :post,
    foreign_key: :post_id,
    dependent:   :destroy
  has_many :post_rules,
    class_name:  'Rule',
    inverse_of:  :pre,
    foreign_key: :pre_id,
    dependent:   :destroy

  has_many :tags,
    -> { order(order: :asc, title: :asc) },
    through: :taggings

  has_many :prereqs,
    class_name: 'Task',
    through:    :pre_rules,
    source:     :pre
  has_many :postreqs,
    class_name: 'Task',
    through:    :post_rules,
    source:     :post

  validates :title,
    presence:   true,
    uniqueness: { case_sensitive: false, scope: :user_id }

  # FIXME: Do this using a global override
  def title=(value)
    if value.is_a?(String) && value.present?
      super(value.delete("\u0000"))
    else
      super(value)
    end
  end
end

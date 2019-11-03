class Task < ApplicationRecord
  has_many :pre_rules,
    class_name: 'Rule',
    foreign_key: :post_id,
    dependent: :destroy
  has_many :post_rules,
    class_name: 'Rule',
    foreign_key: :pre_id,
    dependent: :destroy

  has_many :prereqs,
    class_name: 'Task',
    through: :pre_rules,
    source: :pre
  has_many :postreqs,
    class_name: 'Task',
    through: :post_rules,
    source: :post

  validates :title,
    presence: true,
    uniqueness: { case_sensitive: false }

  def self.search(title)
    if title.present?
      where('title iLIKE :title', title: "%#{title}%")
    else
      all
    end
  end

  def to_tree
    results = {
      id: id,
      title: title,
      completed: completed,
    }

    results.merge!({ postreqs: postreqs.map{ |post| post.to_tree } }) if postreqs.any?

    results
  end
end

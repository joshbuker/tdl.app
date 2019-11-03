class Task < ApplicationRecord
  has_many :prereqs,
    class_name: 'Rule',
    foreign_key: :post_id
  has_many :postreqs,
    class_name: 'Rule',
    foreign_key: :pre_id

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
end

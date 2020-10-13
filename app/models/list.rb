class List < ApplicationRecord
  belongs_to :user

  has_many :tasks, dependent: :destroy

  validates :title,
    presence: true,
    uniqueness: { case_sensitive: false, scope: :user_id }

  validates :order,
    presence: true

  validate :reserved_title

  def to_hash
    {
      id: id,
      title: title,
      task_count: tasks.next_up.size
    }
  end

  def to_json
    self.to_hash.to_json
  end

  private

  def reserved_title
    return unless title == 'All Tasks'
    errors.add(:title, 'This list name is reserved, sorry!')
  end
end

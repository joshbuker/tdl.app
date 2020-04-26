class List < ApplicationRecord
  belongs_to :user

  has_many :tasks

  validates :title,
    presence: true,
    uniqueness: { case_sensitive: false, scope: :user_id }

  validates :order,
    presence: true

  validate :reserved_title

  private

  def reserved_title
    return unless title == 'All Tasks'
    errors.add(:title, 'This list name is reserved, sorry!')
  end
end

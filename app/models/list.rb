class List < ApplicationRecord
  belongs_to :user

  has_many :tasks

  validates :title,
    presence: true,
    uniqueness: { case_sensitive: false }

  validates :order,
    presence: true
end

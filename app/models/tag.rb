class Tag < ApplicationRecord
  belongs_to :user

  has_many :taggings

  has_many :tasks,
    through: :taggings

  validates :title, :color,
    presence: true

  # TODO: Validate that color is a hex color code
end

class Tag < ApplicationRecord
  belongs_to :user

  has_many :taggings, dependent: :destroy

  has_many :tasks,
    through: :taggings

  validates :title,
    presence: true

  validates :color,
    presence:             true,
    hex_color_formatting: true

  validates :title,
    uniqueness: { case_sensitive: false, scope: :user_id }

  def randomize_color!
    temp = self.color.blank? ? "#FFFFFF" : self.color
    while temp.casecmp(self&.color) == 0 do
      self.color = "##{Random.hex(3)}"
    end
  end
end

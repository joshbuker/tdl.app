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
    # Literal fucking witchcraft, turns three bytes into hexcode.
    self.color = "##{Random.bytes(3).unpack1('H*')}"
  end
end

class Tag < ApplicationRecord
  belongs_to :user

  has_many :taggings

  has_many :tasks,
    through: :taggings

  validates :title, :color,
    presence: true

  # TODO: Validate that color is a hex color code

  def text_color(light: '#ffffff', dark: '#000000')
    background_color = color.dup
    return dark if background_color.blank?
    background_color.gsub!('#', '')
    return dark if background_color.length != 6
    red = (background_color[0..1].hex)
    green = (background_color[2..3].hex)
    blue = (background_color[4..5].hex)
    # Luminance values for different hues are not equal.
    greyscale = red * 0.299 + green * 0.587 + blue * 0.114
    # Perceived midpoint for grey is higher than 128. (around 186)
    midpoint = 152
    (greyscale > midpoint) ? dark : light
  end
end

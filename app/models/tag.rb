class Tag < ApplicationRecord
  belongs_to :user

  has_many :taggings, dependent: :destroy

  has_many :tasks,
    through: :taggings

  validates :title, :color,
    presence: true

  validates :title,
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

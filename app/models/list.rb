class List < ApplicationRecord
  belongs_to :user

  has_many :tasks, dependent: :restrict_with_exception

  validates :title,
    presence:   true,
    uniqueness: { case_sensitive: false, scope: :user_id }

  validates :order,
    presence: true

  # FIXME: Do this using a global override
  def title=(value)
    if value.is_a?(String) && value.present?
      super(value.delete("\u0000"))
    else
      super(value)
    end
  end
end

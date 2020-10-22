class User < ApplicationRecord
  authenticates_with_sorcery!

  has_many :lists
  has_many :tags

  has_many :tasks,
    through: :lists

  validates :given_name, :family_name, :email,
    presence: true

  validates :password,
    presence: true,
    if: -> { new_record? || changes[:crypted_password] }

  validates :username,
    presence: true,
    uniqueness: { case_sensitive: false }

  validates :timezone,
    presence: true,
    timezone: true

  def js_timezone
    return nil unless timezone.present?
    ActiveSupport::TimeZone[timezone].tzinfo.name
  end
end

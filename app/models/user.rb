class User < ApplicationRecord
  validates :given_name, :family_name, :email,
    presence: true

  validates :username,
    presence: true,
    uniqueness: { case_sensitive: false }
end

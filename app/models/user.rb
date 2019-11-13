class User < ApplicationRecord
  has_many :lists
  has_many :tags

  has_many :tasks,
    through: :lists

  validates :given_name, :family_name, :email,
    presence: true

  validates :username,
    presence: true,
    uniqueness: { case_sensitive: false }
end

class User < ApplicationRecord
  authenticates_with_sorcery!

  ########################
  ## Virtual Attributes ##
  ########################

  # Sorcery creates a `:password` virtual attribute for us.

  attr_accessor :bypass_password

  #################
  ## Validations ##
  #################

  validates :password,
    presence: true,
    password: true,
    if:       lambda {
                (new_record? && !bypass_password?) || changes[:password_digest]
              }

  validates :email,
    presence: true,
    email:    true

  # Only validate uniqueness if we're creating a new user, or editing said
  # field. This saves needing a query every time you validate a user, without
  # losing any functionality.

  validates :username,
    uniqueness: { case_sensitive: false },
    if:         -> { new_record? || changes[:username] }

  validates :email,
    uniqueness: { case_sensitive: false },
    if:         -> { new_record? || changes[:email] }

  ######################
  ## Instance Methods ##
  ######################

  def bypass_password?
    !!bypass_password
  end
end

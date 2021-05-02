Sorcery.configure do |config|
  config.user_class = 'User'

  config.encryption_algorithm = :argon2
  config.crypted_password_attribute_name = :password_digest
end

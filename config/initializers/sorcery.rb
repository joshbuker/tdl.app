Sorcery.configure do |config|
  config.user_class = 'User'
  config.session_class = 'Session'

  config.password_hashing_algorithm = :argon2
  config.session_store = :jwt_session

  config.load_plugin(:brute_force_protection)
end

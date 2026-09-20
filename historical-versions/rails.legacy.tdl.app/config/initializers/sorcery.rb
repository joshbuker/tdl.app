# The first thing you need to configure is which modules you need in your app.
# The default is nothing which will include only core features (password encryption, login/logout).
#
# Available submodules are: :user_activation, :http_basic_auth, :remember_me,
# :reset_password, :session_timeout, :brute_force_protection, :activity_logging,
# :magic_login, :external
Rails.application.config.sorcery.submodules = [
  :activity_logging,
  :brute_force_protection,
  :remember_me
]

# Here you can configure each submodule's features.
Rails.application.config.sorcery.configure do |config|
  config.cookie_domain = 'legacy.tdl.app'
  config.user_class = 'User'

  config.user_config do |user|
    user.username_attribute_names = [:username]
    user.stretches = 1 if Rails.env.test?
    user.remember_me_token_persist_globally = true
    user.consecutive_login_retries_amount_limit = 10
  end
end

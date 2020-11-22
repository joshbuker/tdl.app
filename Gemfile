source 'https://rubygems.org'
git_source(:github) { |repo| "git@github.com:#{repo}.git" }

ruby '2.7.2'

# Bundle edge Rails instead: gem 'rails', github: 'rails/rails'
gem 'rails', '~> 6.0.0'
# Use postgresql as the database for Active Record
gem 'pg', '>= 0.18', '< 2.0'
# Use Puma as the app server
gem 'puma', '~> 3.11'
# Use SCSS for stylesheets
gem 'sass-rails', '~> 5'
# Transpile app-like JavaScript. Read more: https://github.com/rails/webpacker
gem 'webpacker', '~> 5.0'
# Turbolinks makes navigating your web application faster. Read more: https://github.com/turbolinks/turbolinks
gem 'turbolinks', '~> 5'
# Build JSON APIs with ease. Read more: https://github.com/rails/jbuilder
gem 'jbuilder', '~> 2.7'
# Use Redis adapter to run Action Cable in production
# gem 'redis', '~> 4.0'
# Use Active Model has_secure_password
# gem 'bcrypt', '~> 3.1.7'

# Better views
gem 'slim-rails'

# Use Active Storage variant
# gem 'image_processing', '~> 1.2'

# User sessions
gem 'sorcery'

# Keep session data on the server
gem 'activerecord-session_store'

# Reduces boot times through caching; required in config/boot.rb
gem 'bootsnap', '>= 1.4.2', require: false

# Browser / device / mobile detection
gem 'browser'

# Store delayed jobs in the database (e.g. scheduled push notifications)
gem 'delayed_job_active_record'

group :development, :test do
  # Call 'byebug' anywhere in the code to stop execution and get a debugger console
  gem 'byebug', platforms: [:mri, :mingw, :x64_mingw]
  gem 'rspec-rails'
  gem 'factory_bot_rails'
  gem 'rails_real_favicon'
end

group :development do
  # Access an interactive console on exception pages or by calling 'console' anywhere in the code.
  gem 'web-console', '>= 3.3.0'
  gem 'listen', '>= 3.0.5', '< 3.2'
  # Spring speeds up development by keeping your application running in the background. Read more: https://github.com/rails/spring
  gem 'spring'
  gem 'spring-watcher-listen', '~> 2.0.0'
  # Enforce ruby style guide
  gem 'rubocop'
  gem 'rubocop-faker'
  gem 'rubocop-rspec'
  gem 'rubocop-performance'
  # Automatically check against Gemfile.lock for CVEs
  gem 'bundler-audit'
  # Mediocre static code analysis
  gem 'brakeman'
  # Sweet baby jesus, my new favorite gem right here
  gem 'html2slim'
  # Support rendering the service worker file(s) in development
  gem 'webpacker-pwa'
end

group :test do
  gem 'shoulda-matchers'
  gem 'faker'
end

# Windows does not include zoneinfo files, so bundle the tzinfo-data gem
gem 'tzinfo-data', platforms: [:mingw, :mswin, :x64_mingw, :jruby]

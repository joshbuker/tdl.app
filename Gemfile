source 'https://rubygems.org'
git_source(:github) { |repo| "https://github.com/#{repo}.git" }

ruby '3.0.1'

################
## Base Rails ##
################

# Reduces boot times through caching; required in config/boot.rb
gem 'bootsnap', '>= 1.4.4', require: false

gem 'jbuilder', '~> 2.7'
gem 'pg', '~> 1.1'
gem 'puma', '~> 5.0'
gem 'rack-cors'
gem 'rails', '~> 6.1'

# Use Redis adapter to run Action Cable in production
# gem 'redis', '~> 4.0'
# Use Active Model has_secure_password
# gem 'bcrypt', '~> 3.1.7'

# Use Active Storage variant
# gem 'image_processing', '~> 1.2'

##########################
## Application Specific ##
##########################

# API Documentation via OpenAPI 3.0
gem 'rswag-api'
gem 'rswag-ui'

##########################
## Environment Specific ##
##########################

group :development, :test do
  gem 'brakeman'
  gem 'bundler-audit'
  gem 'byebug'
  gem 'factory_bot_rails'
  gem 'faker' # So faker can be used for both test data and development seeds
  gem 'rspec-rails'
  gem 'rswag-specs'
  gem 'rubocop'
  gem 'rubocop-performance'
  gem 'rubocop-rspec'

  # Prevent parser from yelling at us about mismatched ruby versions
  gem 'parser', '~> 3.0.1.0'
end

group :development do
  gem 'listen'
  gem 'spring'
end

group :test do
  gem 'simplecov', require: false
  gem 'shoulda-matchers'
  gem 'timecop'
end

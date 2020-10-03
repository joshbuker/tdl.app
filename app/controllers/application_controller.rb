class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception

  before_action :require_login
  around_action :set_timezone

  def set_timezone(&block)
    timezone = current_user&.timezone || 'UTC'
    Time.use_zone(timezone, &block)
  end
end

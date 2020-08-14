class ApiController < ActionController::Base
  protect_from_forgery with: :null_session

  before_action :require_login
end

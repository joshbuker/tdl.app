class ApiController < ActionController::Base
  protect_from_forgery :with => :null_session

  # TODO: Use Sorcery for this.
  def current_user
    return @current_user if defined?(@current_user)

    if session[:user_id].present?
      @current_user ||= User.find_by(id: session[:user_id])
    else
      @current_user = nil
    end

    @current_user
  end
end

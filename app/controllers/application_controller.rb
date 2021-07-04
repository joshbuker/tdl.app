class ApplicationController < ActionController::API
  # Load Pundit for Authorization
  include Pundit

  # Load Sorcery for Authentication
  authenticates_with_sorcery!

  # Does JBuilder offer any on_load hooks that can let us do this in Sorcery?
  helper_method :current_user

  ##############################
  ## Global Rescue Statements ##
  ##############################

  rescue_from Pundit::NotAuthorizedError, with: :not_authorized
  rescue_from NotImplementedError, with: :endpoint_not_implemented

  ######################
  ## Global Callbacks ##
  ######################

  before_action :require_login

  ####################
  ## Global Methods ##
  ####################

  # Fun fact, 401 is called unauthorized, but is used to indicate
  # unauthenticated errors. 403 is called forbidden, and used for unauthorized
  # errors. Yes, this does indeed irritate me to no end.

  def not_authenticated
    render json: { error: 'Access token is missing or invalid' },
      status: :unauthorized
  end

  def not_authorized
    render json: { error: 'You don\'t have permission to do that.' },
      status: :forbidden
  end

  def endpoint_not_implemented(err)
    render json: { error: err.message }, status: :not_implemented
  end
end

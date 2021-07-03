class ApplicationController < ActionController::API
  authenticates_with_sorcery!

  # Does JBuilder offer any on_load hooks that can let us do this in Sorcery?
  helper_method :current_user

  ##############################
  ## Global Rescue Statements ##
  ##############################

  rescue_from NotImplementedError, with: :endpoint_not_implemented

  ######################
  ## Global Callbacks ##
  ######################

  before_action :require_login

  ####################
  ## Global Methods ##
  ####################

  def not_authenticated
    render json: { error: 'Access token is missing or invalid' },
      status: :unauthorized
  end

  def endpoint_not_implemented(err)
    render json: { error: err.message }, status: :not_implemented
  end
end

class UserSessionsController < ApplicationController
  skip_before_action :require_login, except: [:destroy]

  def create
    if (session_token = login(params[:login], params[:password]))
      render json: { session_token: session_token }
    else
      render json: { error: I18n.t('.failed') }, status: :bad_request
    end
  rescue ArgumentError
    render json: { error: I18n.t('.invalid_params') }, status: :bad_request
  end

  def destroy
    if logged_in?
      logout
      head :ok
    else
      render json: { error: I18n.t('.failed') }, status: :bad_request
    end
  end

  def verify_auth_token
    raise NotImplementedError, I18n.t('.pending_implementation')
  end

  def verify_authy_app
    raise NotImplementedError, I18n.t('.pending_implementation')
    if (session_token = verify(params[:otp]))
      # Give session JWT as response
    else
      render json: { error: I18n.t('.failed') }, status: :bad_request
    end
  end
end

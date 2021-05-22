class SessionsController < ApplicationController
  skip_before_action :require_login, except: [:destroy]

  def create
    if (session_token = login(params[:login], params[:password]))
      render json: { session_token: session_token }
    else
      render json: { error: t('.failed') }, status: :bad_request
    end
  end

  def destroy
    if logged_in?
      logout
      head :ok
    else
      render json: { error: t('.failed') }, status: :bad_request
    end
  end

  def verify_auth_token
    raise NotImplementedError, t('.pending_implementation')
  end

  def verify_authy_app
    if (session_token = verify(params[:otp]))
      raise NotImplementedError, t('.pending_implementation')
      # Give session JWT as response
    else
      render json: { error: t('.failed') }, status: :bad_request
    end
  end
end

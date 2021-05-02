class SessionsController < ApplicationController
  skip_before_action :require_login, except: [:destroy]

  def create
    if (session = login(params[:login], params[:password]))
      raise NotImplementedError, t('.pending_implementation')
      # Give session JWT as response
    else
      render json: { error: t('.failed') }, status: :bad_request
    end
  end

  def destroy
    if logged_in?
      raise NotImplementedError, t('.pending_implementation')
      forget_me!
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
    if (session = verify(params[:otp]))
      raise NotImplementedError, t('.pending_implementation')
      # Give session JWT as response
    else
      render json: { error: t('.failed') }, status: :bad_request
    end
  end
end

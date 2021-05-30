class UserSessionsController < ApplicationController
  skip_before_action :require_login, except: [:destroy]

  def create
    if (session_token = login(params[:login], params[:password]))
      render json: { session_token: session_token }
    else
      render json: { error: I18n.t('user_sessions.create.failed') },
        status: :bad_request
    end
  rescue ArgumentError
    render json: { error: I18n.t('user_sessions.create.invalid_params') },
      status: :bad_request
  end

  def destroy
    if logged_in?
      logout
      head :ok
    else
      render json: { error: I18n.t('user_sessions.destroy.failed') },
        status: :bad_request
    end
  end

  def verify_auth_token
    raise NotImplementedError,
      I18n.t('user_sessions.verify_auth_token.pending_implementation')
  end

  # rubocop:disable Lint/UnreachableCode
  # rubocop:disable Lint/UselessAssignment
  def verify_authy_app
    raise NotImplementedError,
      I18n.t('user_sessions.verify_authy_app.pending_implementation')
    if (session_token = verify(params[:otp]))
      # Give session JWT as response
    else
      render json: { error: I18n.t('user_sessions.verify_authy_app.failed') },
        status: :bad_request
    end
  end
  # rubocop:enable Lint/UnreachableCode
  # rubocop:enable Lint/UselessAssignment
end

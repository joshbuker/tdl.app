class SessionsController < ApplicationController
  skip_before_action :require_login, only: [:create]

  def create
    if current_user
      respond_to do |format|
        format.html do
          redirect_to root_path, error: 'You are already logged in.',
            status: :bad_request
        end
        format.json do
          render json: { error: 'You are already logged in.' },
            status: :bad_request
        end
      end
      return
    end

    if (@user = login(params[:username], params[:password]))
      remember_me!

      respond_to do |format|
        format.html { redirect_to root_path }
        format.json { head :ok }
      end
    else
      respond_to do |format|
        format.html { redirect_to root_path, error: 'Failed to login.', status: :bad_request }
        format.json { head :bad_request }
      end
    end
  end

  def destroy
    if current_user
      forget_me!
      logout

      respond_to do |format|
        format.html { redirect_to root_path }
        format.json { head :ok }
      end
    else
      respond_to do |format|
        format.html { redirect_to root_path, error: 'Already logged out.', status: :bad_request }
        format.json { head :bad_request }
      end
    end
  end
end

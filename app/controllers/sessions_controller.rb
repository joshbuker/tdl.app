class SessionsController < ApplicationController
  # NOTE: This doesn't even pretend to be secure. Literally just for testing.
  def create
    unless params[:username].present?
      respond_to do |format|
        format.html do
          redirect_to root_path, error: 'You must provide username to login.'
        end
        format.json do
          render json: { error: 'You must provide username to login.' },
            status: :bad_request
        end
      end
      return
    end

    if current_user
      respond_to do |format|
        format.html do
          redirect_to root_path, error: 'You are already logged in.'
        end
        format.json do
          render json: { error: 'You are already logged in.' },
            status: :bad_request
        end
      end
      return
    end

    user = User.find_by!(username: params[:username])
    auto_login(user)

    respond_to do |format|
      format.html { redirect_to root_path }
      format.json { head :ok }
    end
  rescue ActiveRecord::RecordNotFound => e
    respond_to do |format|
      format.html do
        redirect_to root_path, error: e.message
      end
      format.json do
        render json: { error: e.message },
          status: :bad_request
      end
    end
  end

  def destroy
    if current_user
      logout

      respond_to do |format|
        format.html { redirect_to root_path }
        format.json { head :ok }
      end
    else
      respond_to do |format|
        format.html { redirect_to root_path, error: 'Already logged out.' }
        format.json { head :bad_request }
      end
    end
  end
end

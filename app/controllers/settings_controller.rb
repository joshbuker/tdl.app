class SettingsController < ApplicationController
  def username
    render json: { username: current_user.username }
  end
end

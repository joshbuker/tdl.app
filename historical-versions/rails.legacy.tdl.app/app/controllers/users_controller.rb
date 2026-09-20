class UsersController < ApiController
  def timezone
    render json: current_user.js_timezone.to_json
  end

  def update_timezone
    current_user.update!(timezone_params)

    render json: current_user.js_timezone.to_json
  end

  private

  def timezone_params
    params.permit(:timezone)
  end
end

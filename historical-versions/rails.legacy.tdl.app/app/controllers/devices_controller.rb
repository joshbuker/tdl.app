class DevicesController < ApiController
  def create
    existing_device = current_user.devices.find_by(
      push_endpoint: params[:push_endpoint],
      push_p256dh: params[:push_p256dh],
      push_auth: params[:push_auth]
    )

    if existing_device.present?
      render json: existing_device.to_json
      return
    end

    device = Device.new(device_params)
    device.user = current_user
    device.user_agent = request.headers['User-Agent']
    device.last_seen_at = Time.current

    device.save!

    render json: device.to_json
  rescue ActiveRecord::RecordInvalid => e
    render json: { error: e.message }, status: :unprocessable_entity
  end

private

  def device_params
    params.require(:device).permit(
      :push_endpoint,
      :push_p256dh,
      :push_auth
    )
  end
end

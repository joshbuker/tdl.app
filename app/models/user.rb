class User < ApplicationRecord
  authenticates_with_sorcery!

  has_many :lists
  has_many :tags

  has_many :tasks,
    through: :lists

  validates :given_name, :family_name, :email,
    presence: true

  validates :password,
    presence: true,
    if: -> { new_record? || changes[:crypted_password] }

  validates :username,
    presence: true,
    uniqueness: { case_sensitive: false }

  validates :timezone,
    presence: true,
    timezone: true

  def js_timezone
    return nil unless timezone.present?
    ActiveSupport::TimeZone[timezone].tzinfo.name
  end

  def push_notification(message, subject)
    raise ArgumentError, 'No endpoint available!' unless push_endpoint.present?
    raise ArgumentError, 'No p256dh available!' unless push_p256dh.present?
    raise ArgumentError, 'No auth available!' unless push_auth.present?

    # There should probably be some validation that the endpoint and such are
    # real values, and not someone fuzzing with bullshit. (e.g. manually hits
    # the save subscription endpoint with an endpoint of https://example.com)

    Webpush.payload_send(
      message: message,
      endpoint: push_endpoint,
      p256dh: push_p256dh,
      auth: push_auth,
      vapid: {
        subject: subject,
        public_key: ENV['VAPID_PUBLIC_KEY'],
        private_key: ENV['VAPID_PRIVATE_KEY']
      }
    )
  end
end

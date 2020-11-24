class Device < ApplicationRecord
  belongs_to :user

  validates :push_endpoint, :push_p256dh, :push_auth,
    presence: true

  validates :user, :user_agent, :last_seen_at,
    presence: true

  # TODO: Remove? (only needed if push values are allowed to be nil, which they
  #       are not currently.)
  # scope :active, lambda {
  #   where.not(push_endpoint: nil).
  #   where.not(push_p256dh: nil).
  #   where.not(push_auth: nil)
  # }
  # TODO: Remove? /\

  def active?
    push_endpoint.present? &&
    push_p256dh.present? &&
    push_auth.present?
  end

  def push_notification(message, subject)
    return unless active?
    return unless message.present? && subject.present?

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

    # TODO: Check if payload succeeded, if it fails (401), destroy device record

    # Skip model validations and just update the field directly
    self.update_column(:last_seen_at, Time.current)
  end
end

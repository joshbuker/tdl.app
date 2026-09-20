class TimezoneValidator < ActiveModel::EachValidator
  def validate_each(record, field, value)
    return if value.blank?
    record.errors[field] << I18n.t('validators.available_time_zone') unless ActiveSupport::TimeZone[value].present?
  end
end

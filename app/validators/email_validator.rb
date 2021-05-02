class EmailValidator < ActiveModel::EachValidator
  def validate_each(record, attribute, value)
    return if value.blank? || value =~ URI::MailTo::EMAIL_REGEXP

    record.errors[attribute] <<
      I18n.t('validators.email.invalid_format')
  end
end

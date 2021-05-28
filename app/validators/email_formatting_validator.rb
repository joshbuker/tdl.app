class EmailFormattingValidator < ActiveModel::EachValidator
  def validate_each(record, field, value)
    return if value.blank?

    if value != value.downcase
      record.errors.add(
        field,
        message: I18n.t('validators.email_formatting.must_be_lowercase')
      )
    end

    # NOTE: Regex is witchcraft
    return if value =~ URI::MailTo::EMAIL_REGEXP

    record.errors.add(
      field,
      message: I18n.t('validators.email_formatting.invalid_format')
    )
  end
end

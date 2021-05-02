class PasswordValidator < ActiveModel::EachValidator
  def validate_each(record, attribute, value)
    return if value.blank?

    if value.length > 256
      record.errors[attribute] << I18n.t('validators.password.too_long')
    elsif value.length < 8
      record.errors[attribute] << I18n.t('validators.password.too_short')
    end

    return unless password_complexity(value) < 3

    record.errors[attribute] <<
      I18n.t('validators.password.not_enough_complexity')
  end

  def password_complexity(value)
    complexity = 0
    # Any Upper-case Letters
    complexity += 1 if /[A-Z]/.match?(value)
    # Any Lower-case letters
    complexity += 1 if /[a-z]/.match?(value)
    # Any digits
    complexity += 1 if /[0-9]/.match?(value)
    # Any Special Characters (non-alphanumeric nor whitespace)
    complexity += 1 if value.gsub(/[A-Z, a-z0-9\s+]/, '').length.positive?
    complexity
  end
end

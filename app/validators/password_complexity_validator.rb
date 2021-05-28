class PasswordComplexityValidator < ActiveModel::EachValidator
  def validate_each(record, field, value)
    return if value.blank? || password_complexity(value) >= 3

    record.errors.add(
      field,
      message: I18n.t('validators.password_complexity.not_enough_complexity')
    )
  end

  def password_complexity(value)
    complexity = 0
    # Any Upper-case Letters
    complexity += 1 if value =~ /[A-Z]/
    # Any Lower-case letters
    complexity += 1 if value =~ /[a-z]/
    # Any digits
    complexity += 1 if value =~ /[0-9]/
    # Any Special Characters (non-alphanumeric nor whitespace)
    complexity += 1 if value.gsub(/[A-Z, a-z, 0-9, \s+]/, '').length.positive?
    return complexity
  end
end

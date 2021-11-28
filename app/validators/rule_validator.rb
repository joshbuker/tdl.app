class RuleValidator < ActiveModel::EachValidator
  def validate_each(_record, _field, value)
    return if value.blank?
  end
end

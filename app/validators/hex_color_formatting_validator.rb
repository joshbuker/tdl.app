class HexColorValidator < ActiveModel::EachValidator
	def validate_each(record, field, value)
		return if value.blank?
		# FIXME: create a Hex Color concern to store Hex Color logic.
		# while randomize_color only generates 6-character colors,
		# 3 or 6 are valid rgb
		return if value =~ /\A#(\h{3}){1,2}\z/
		record.errors.add(
		  field,
		  message: I18n.t('validators.hex_color.invalid_format')
		)
	end
end

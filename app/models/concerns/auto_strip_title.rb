module AutoStripTitle
  extend ActiveSupport::Concern

  included do
    before_validation :strip_title
  end

  def strip_title
    self.title = title.to_s.strip if title.is_a?(String)
  end
end

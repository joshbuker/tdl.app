require 'rails_helper'

RSpec.describe EmailValidator do
  subject { described_class.new(attributes: { any: true }) }

end

require 'rails_helper'

RSpec.describe Device do
  subject { build :device }

  it 'has valid factory.' do
    expect(subject).to be_valid
  end

  context 'associations' do
    # TODO: Add tests or remove placeholder
  end

  context 'validations' do
    # TODO: Add tests or remove placeholder
  end
end

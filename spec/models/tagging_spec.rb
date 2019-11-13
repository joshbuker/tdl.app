require 'rails_helper'

RSpec.describe Tagging do
  subject { build :tagging }

  it 'has valid factory.' do
    expect(subject).to be_valid
  end

  context 'associations' do
    it { is_expected.to belong_to(:tag) }
    it { is_expected.to belong_to(:task) }
  end

  context 'validations' do
    # TODO: Add tests or remove placeholder
  end
end

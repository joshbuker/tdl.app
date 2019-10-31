require 'rails_helper'

RSpec.describe Rule do
  subject { build :rule }

  it 'has valid factory.' do
    expect(subject).to be_valid
  end

  context 'associations' do
    it { is_expected.to belong_to(:pre) }
    it { is_expected.to belong_to(:post) }
  end
end

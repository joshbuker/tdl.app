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

  context 'validations' do
    it { is_expected.to validate_uniqueness_of(:pre).scoped_to(:post_id) }
    it { is_expected.to validate_uniqueness_of(:post).scoped_to(:pre_id) }
  end
end

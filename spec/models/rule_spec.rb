require 'rails_helper'

RSpec.describe Rule do
  subject(:record) { build :rule }

  it 'has valid factory' do
    expect(record).to be_valid
  end

  describe 'associations' do
    it { should belong_to(:pre) }
    it { should belong_to(:post) }
  end

  describe 'validations' do
    it { should validate_uniqueness_of(:pre).scoped_to(:post_id) }
    it { should validate_uniqueness_of(:post).scoped_to(:pre_id) }
  end
end

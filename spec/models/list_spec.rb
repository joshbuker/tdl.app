require 'rails_helper'

RSpec.describe List do
  subject { build :list }

  it 'has valid factory.' do
    expect(subject).to be_valid
  end

  context 'associations' do
    it { is_expected.to belong_to(:user) }
    it { is_expected.to have_many(:tasks) }
  end

  context 'validations' do
    it { is_expected.to validate_presence_of(:title) }
    it { is_expected.to validate_presence_of(:order) }
    it { is_expected.to validate_uniqueness_of(:title).case_insensitive }
  end
end

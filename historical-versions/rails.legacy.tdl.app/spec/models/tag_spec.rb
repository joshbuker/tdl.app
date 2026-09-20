require 'rails_helper'

RSpec.describe Tag do
  subject { build :tag }

  it 'has valid factory.' do
    expect(subject).to be_valid
  end

  context 'associations' do
    it { is_expected.to belong_to(:user) }
    it { is_expected.to have_many(:taggings) }
    it { is_expected.to have_many(:tasks).through(:taggings) }
  end

  context 'validations' do
    it { is_expected.to validate_presence_of(:title) }
    it { is_expected.to validate_presence_of(:color) }
  end
end

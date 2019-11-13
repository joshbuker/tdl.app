require 'rails_helper'

RSpec.describe User do
  subject { build :user }

  it 'has valid factory.' do
    expect(subject).to be_valid
  end

  context 'associations' do
    it { is_expected.to have_many(:lists) }
    it { is_expected.to have_many(:tasks).through(:lists) }
  end

  context 'validations' do
    it { is_expected.to validate_presence_of(:username) }
    it { is_expected.to validate_presence_of(:given_name) }
    it { is_expected.to validate_presence_of(:family_name) }
    it { is_expected.to validate_presence_of(:email) }
    it { is_expected.to validate_uniqueness_of(:username).case_insensitive }
  end
end

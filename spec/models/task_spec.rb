require 'rails_helper'

RSpec.describe Task do
  subject { build :task }

  it 'has valid factory.' do
    expect(subject).to be_valid
  end

  context 'associations' do
    it { is_expected.to have_many(:pre_rules) }
    it { is_expected.to have_many(:post_rules) }
    it { is_expected.to have_many(:prereqs).through(:pre_rules) }
    it { is_expected.to have_many(:postreqs).through(:post_rules) }
  end

  context 'validations' do
    it { is_expected.to validate_presence_of(:title) }
    it { is_expected.to validate_uniqueness_of(:title).case_insensitive }
  end
end

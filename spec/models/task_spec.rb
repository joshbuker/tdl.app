require 'rails_helper'

RSpec.describe Task do
  subject { build :task }

  it 'has valid factory.' do
    expect(subject).to be_valid
  end

  context 'associations' do
    # TODO: Add tests or remove placeholder
  end

  context 'validations' do
    it { is_expected.to validate_presence_of(:title) }
    it { is_expected.to validate_uniqueness_of(:title).case_insensitive }
  end
end

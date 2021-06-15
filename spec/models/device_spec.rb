require 'rails_helper'

RSpec.describe Device do
  subject(:record) { build :device }

  it 'has valid factory' do
    expect(record).to be_valid
  end

  describe 'associations' do
    it { should belong_to(:user) }
  end
end

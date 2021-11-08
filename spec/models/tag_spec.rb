require 'rails_helper'

RSpec.describe Tag do
  subject(:record) { build :tag }

  it 'has valid factory' do
    expect(record).to be_valid
  end

  describe 'associations' do
    it { should belong_to(:user) }
    it { should have_many(:taggings).dependent(:destroy) }
    it { should have_many(:tasks).through(:taggings) }
  end

  describe 'validations' do
    it { should validate_presence_of(:title) }
    it { should validate_uniqueness_of(:title).case_insensitive.scoped_to(:user_id) }

    it { should validate_presence_of(:color) }
    it { should validate_hex_color_formatting_of(:color) }
  end

  describe 'instance method' do
    describe 'randomize_color' do

      REGEX_HEX_COLOR = /\A#(\h{3}){1,2}\z/

      context 'when color value is empty string' do
        subject(:color) do
          tag = build :tag
          tag.color = ''
          tag.randomize_color!
          expect REGEX_HEX_COLOR.match?(tag.color).to be true
        end

        #it { should be_truthy }
      end

      context 'when color value is nil' do
        subject(:color) do
          tag = build :tag
          tag.color = nil
          tag.randomize_color!
          expect REGEX_HEX_COLOR.match?(tag.color).to be true
        end

        #it { should be_truthy }
      end

      context 'when color value is already set' do
        subject(:color) do
          tag = build :tag
          tag2 = build :tag
          tag2.color = tag.color
          tag.randomize_color!
          tag.color != tag2.color
        end

        it { should be_truthy }
      end
    end
  end
end

require 'rails_helper'

RSpec.describe User do
  subject(:record) { build :user }

  it 'has valid factory' do
    expect(record).to be_valid
  end

  describe 'associations' do
    it { should have_many(:devices).dependent(:destroy) }
    it { should have_many(:sessions).dependent(:destroy) }
  end

  describe 'validations' do
    it { should validate_presence_of(:given_name) }
    it { should validate_presence_of(:family_name) }

    it { should validate_presence_of(:time_zone) }
    it { should validate_time_zone_of(:time_zone) }

    it { should validate_presence_of(:locale) }
    it { should validate_locale_availability_of(:locale) }

    it { should validate_presence_of(:username) }
    it { should validate_uniqueness_of(:username).case_insensitive }
    it { should validate_username_formatting_of(:username) }

    it { should validate_presence_of(:email) }
    it { should validate_uniqueness_of(:email).case_insensitive }
    it { should validate_email_formatting_of(:email) }

    it { should validate_presence_of(:password) }
    it { should validate_length_of(:password).is_at_least(8).is_at_most(128) }
    it { should validate_password_complexity_of(:password) }

    it { should validate_presence_of(:terms_and_conditions) }
    it { should validate_acceptance_of(:terms_and_conditions) }
  end

  describe 'callbacks' do
    # TODO: Add tests or remove placeholder
  end

  describe 'scopes' do
    # TODO: Add tests or remove placeholder
  end

  describe 'class method' do
    # TODO: Add tests or remove placeholder
  end

  describe 'instance method' do
    # TODO: Add tests or remove placeholder
  end
end

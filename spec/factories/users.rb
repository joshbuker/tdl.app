FactoryBot.define do
  factory :user do
    username    { Faker::Internet.username }
    given_name  { Faker::Name.first_name }
    family_name { Faker::Name.last_name }
    email       { Faker::Internet.email }
    password    { Faker::Internet.password }
  end
end

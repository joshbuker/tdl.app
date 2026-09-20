FactoryBot.define do
  factory :list do
    user
    title { Faker::Company.bs }
    order { 0 }
  end
end

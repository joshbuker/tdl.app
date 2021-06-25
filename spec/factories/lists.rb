FactoryBot.define do
  factory :list do
    user
    title { "a#{Faker::String.random.tr("\u0000", '')}" }
  end
end

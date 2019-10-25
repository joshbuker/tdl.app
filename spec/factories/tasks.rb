FactoryBot.define do
  factory :task do
    title { Faker::Company.bs }
  end
end

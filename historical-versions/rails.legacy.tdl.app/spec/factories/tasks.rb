FactoryBot.define do
  factory :task do
    list

    title { Faker::Company.bs }
  end
end

FactoryBot.define do
  factory :tag do
    user
    title { Faker::Company.bs }
    color { Faker::Color.hex_color }
  end
end

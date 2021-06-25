FactoryBot.define do
  factory :tag do
    user
    title { "a#{Faker::String.random.tr("\u0000", '')}" }
    color { [Faker::Color.hex_color, Faker::Color.color_name].sample }
  end
end

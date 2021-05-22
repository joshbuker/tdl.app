FactoryBot.define do
  factory :device do
    user
    user_agent { "MyString" }
  end
end

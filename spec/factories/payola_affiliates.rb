# Read about factories at https://github.com/thoughtbot/factory_bot

FactoryBot.define do
  factory :payola_affiliate, :class => 'Payola::Affiliate' do
    code { "MyString" }
    email { "foo@example.com" }
    percent { 100 }
  end
end

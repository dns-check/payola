FactoryBot.define do
  factory :sale, class: Payola::Sale do
    email { 'test@example.com' }
    product
    after(:build) do |sale|
      sale.product_id ||= sale.product&.id || 1
    end
    stripe_token { 'tok_test' }
    currency { 'usd' }
    amount { 100 }
  end
end

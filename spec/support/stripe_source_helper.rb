module StripeSourceHelper
  def mock_stripe_source(last4: '4242', exp_year: 2025, exp_month: 12, brand: 'Visa')
    source = double('Stripe::Source',
      card: double('card',
        last4: last4,
        exp_year: exp_year,
        exp_month: exp_month,
        brand: brand
      )
    )
    allow(source).to receive(:is_a?).with(Stripe::Source).and_return(true)
    allow(source).to receive(:type).and_return('card')
    source
  end

  def mock_charge_with_source(source, id: 'ch_test123')
    double('charge',
      id: id,
      source: source,
      balance_transaction: 'txn_123',
      respond_to?: false
    )
  end
end

RSpec.configure do |config|
  config.include StripeSourceHelper
end

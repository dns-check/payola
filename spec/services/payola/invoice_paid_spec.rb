require 'spec_helper'

module Payola
  describe InvoicePaid do
    let(:stripe_helper) { StripeMock.create_test_helper }
    it "should do nothing if the invoice has no charge" do
      # create a Payola::Subscription
      plan = create(:subscription_plan)

      customer = Stripe::Customer.create(
        email: 'foo',
        source: stripe_helper.generate_card_token
      )

      stripe_sub = Stripe::Subscription.create(customer: customer.id, items: [{ plan: plan.stripe_id }])
      sub = create(:subscription, plan: plan, stripe_customer_id: customer.id, stripe_id: stripe_sub.id)

      event = StripeMock.mock_webhook_event('invoice.payment_succeeded', subscription: sub.stripe_id, charge: nil)

      count = Payola::Sale.count

      Payola::InvoicePaid.call(event)

      expect(Payola::Sale.count).to eq count
    end

    it "should create a sale" do
      plan = create(:subscription_plan)
      customer = Stripe::Customer.create(
        email: 'foo',
        source: stripe_helper.generate_card_token
      )

      stripe_sub = Stripe::Subscription.create(customer: customer.id, items: [{ plan: plan.stripe_id }])
      sub = create(:subscription, plan: plan, stripe_customer_id: customer.id, stripe_id: stripe_sub.id)

      charge = Stripe::Charge.create(amount: 100, currency: 'usd', customer: customer.id)
      expect(Stripe::BalanceTransaction).to receive(:retrieve).and_return(OpenStruct.new( amount: 100, fee: 3.29, currency: 'usd' ))
      event = StripeMock.mock_webhook_event('invoice.payment_succeeded', subscription: sub.stripe_id, charge: charge.id)

      count = Payola::Sale.count

      sale = Payola::InvoicePaid.call(event)

      expect(Payola::Sale.count).to eq count + 1

      expect(sale.finished?).to be true
    end

    it "should extract card details from Stripe::Source" do
      plan = create(:subscription_plan)
      customer = Stripe::Customer.create(
        email: 'foo',
        source: stripe_helper.generate_card_token
      )

      stripe_sub = Stripe::Subscription.create(customer: customer.id, items: [{ plan: plan.stripe_id }])
      sub = create(:subscription, plan: plan, stripe_customer_id: customer.id, stripe_id: stripe_sub.id)

      charge = Stripe::Charge.create(amount: 100, currency: 'usd', customer: customer.id)

      stripe_source = mock_stripe_source(last4: '7777', exp_year: 2029, exp_month: 5, brand: 'Discover')
      allow(Stripe::Charge).to receive(:retrieve).and_return(
        mock_charge_with_source(stripe_source, id: charge.id)
      )

      expect(Stripe::BalanceTransaction).to receive(:retrieve).and_return(OpenStruct.new(amount: 100, fee: 3.29, currency: 'usd'))
      event = StripeMock.mock_webhook_event('invoice.payment_succeeded', subscription: sub.stripe_id, charge: charge.id)

      sale = Payola::InvoicePaid.call(event)

      expect(sale.card_last4).to eq '7777'
      expect(sale.card_type).to eq 'Discover'
    end

    it "should handle nil source gracefully" do
      plan = create(:subscription_plan)
      customer = Stripe::Customer.create(
        email: 'foo',
        source: stripe_helper.generate_card_token
      )

      stripe_sub = Stripe::Subscription.create(customer: customer.id, items: [{ plan: plan.stripe_id }])
      sub = create(:subscription, plan: plan, stripe_customer_id: customer.id, stripe_id: stripe_sub.id)

      charge = Stripe::Charge.create(amount: 100, currency: 'usd', customer: customer.id)

      allow(Stripe::Charge).to receive(:retrieve).and_return(
        mock_charge_with_source(nil, id: charge.id)
      )

      expect(Stripe::BalanceTransaction).to receive(:retrieve).and_return(OpenStruct.new(amount: 100, fee: 3.29, currency: 'usd'))
      event = StripeMock.mock_webhook_event('invoice.payment_succeeded', subscription: sub.stripe_id, charge: charge.id)

      sale = Payola::InvoicePaid.call(event)

      expect(sale.finished?).to be true
      expect(sale.card_last4).to be_nil
      expect(sale.card_type).to be_nil
    end
  end
end

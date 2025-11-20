require 'spec_helper'

module Payola
  describe UpdateCard do
    let(:stripe_helper) { StripeMock.create_test_helper }

    describe "#call" do
      before do
        @plan = create(:subscription_plan)

        token = StripeMock.generate_card_token({})
        @subscription = create(:subscription, plan: @plan, stripe_token: token, state: 'processing')
        StartSubscription.call(@subscription)
        expect(@subscription.error).to be_nil
        expect(@subscription.active?).to be_truthy
        token2 = StripeMock.generate_card_token({last4: '2233', exp_year: '2021', exp_month: '11', brand: 'JCB'})
        Payola::UpdateCard.call(@subscription, token2)
      end

      it "should change the card" do
        @subscription.reload
        expect(@subscription.card_last4).to eq '2233'
        expect(@subscription.card_expiration).to eq Date.new(2021,11,1)
        expect(@subscription.card_type).to eq 'JCB'
      end
    end

    describe "with Stripe::Source" do
      before do
        @plan = create(:subscription_plan)

        token = StripeMock.generate_card_token({})
        @subscription = create(:subscription, plan: @plan, stripe_token: token, state: 'processing')
        StartSubscription.call(@subscription)
        expect(@subscription.error).to be_nil
        expect(@subscription.active?).to be_truthy
      end

      it "should extract card details from Stripe::Source" do
        token2 = StripeMock.generate_card_token({})

        stripe_source = mock_stripe_source(last4: '8888', exp_year: 2030, exp_month: 10, brand: 'Visa')

        customer = double('customer', default_source: 'src_123')
        allow(customer).to receive_message_chain(:sources, :retrieve).and_return(stripe_source)
        allow(Stripe::Customer).to receive(:retrieve).and_return(customer)
        allow(Stripe::Customer).to receive(:update)

        Payola::UpdateCard.call(@subscription, token2)

        @subscription.reload
        expect(@subscription.card_last4).to eq '8888'
        expect(@subscription.card_expiration).to eq Date.new(2030, 10, 1)
        expect(@subscription.card_type).to eq 'Visa'
      end
    end
  end
end

require 'spec_helper'

module Payola
  describe ChargeCard do
    let(:stripe_helper) { StripeMock.create_test_helper }
    describe "#call" do
      describe "on success" do
        before do
          expect(Stripe::BalanceTransaction).to receive(:retrieve).and_return(OpenStruct.new( amount: 100, fee: 3.29, currency: 'usd' ))
        end
        it "should create a customer" do
          sale = create(:sale, state: 'processing', stripe_token: stripe_helper.generate_card_token)
          ChargeCard.call(sale)
          expect(sale.reload.stripe_customer_id).to_not be_nil
        end

        it "should not create a customer if one already exists" do
          customer = Stripe::Customer.create
          sale = create(:sale, state: 'processing', stripe_customer_id: customer.id)
          expect(Stripe::Customer).to receive(:retrieve).and_return(customer)
          ChargeCard.call(sale)
          expect(sale.reload.stripe_customer_id).to eq customer.id
          expect(sale.state).to eq 'finished'
        end

        it "should create a charge" do
          sale = create(:sale, state: 'processing', stripe_token: stripe_helper.generate_card_token)
          ChargeCard.call(sale)
          expect(sale.reload.stripe_id).to_not be_nil
          expect(sale.reload.card_last4).to_not be_nil
          expect(sale.reload.card_expiration).to_not be_nil
          expect(sale.reload.card_type).to_not be_nil
        end

        it "should get the fee from the balance transaction" do
          sale = create(:sale, state: 'processing', stripe_token: stripe_helper.generate_card_token)
          ChargeCard.call(sale)
          expect(sale.reload.fee_amount).to_not be_nil
        end

        it "should extract card details from Stripe::Source" do
          sale = create(:sale, state: 'processing', stripe_token: stripe_helper.generate_card_token)

          stripe_source = mock_stripe_source(last4: '9999', exp_year: 2028, exp_month: 8, brand: 'Amex')
          charge = mock_charge_with_source(stripe_source)
          allow(Stripe::Charge).to receive(:create).and_return(charge)

          ChargeCard.call(sale)

          expect(sale.reload.card_last4).to eq '9999'
          expect(sale.reload.card_expiration).to eq Date.new(2028, 8, 1)
          expect(sale.reload.card_type).to eq 'Amex'
        end

        it "should handle nil source gracefully" do
          sale = create(:sale, state: 'processing', stripe_token: stripe_helper.generate_card_token)

          charge = mock_charge_with_source(nil, id: 'ch_test456')
          allow(Stripe::Charge).to receive(:create).and_return(charge)

          ChargeCard.call(sale)

          expect(sale.reload.state).to eq 'finished'
          expect(sale.reload.stripe_id).to eq 'ch_test456'
          expect(sale.reload.card_last4).to be_nil
        end
      end

      describe "on error" do
        it "should update the error attribute" do

          StripeMock.prepare_card_error(:card_declined)
          sale = create(:sale, state: 'processing', stripe_token: stripe_helper.generate_card_token)
          ChargeCard.call(sale)
          expect(sale.reload.error).to_not be_nil
          expect(sale.errored?).to be true
        end
      end
    end
  end
end


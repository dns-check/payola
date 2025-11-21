require 'spec_helper'

module Payola
  describe CardDetailsExtractor do
    describe ".extract" do
      context "with nil input" do
        it "returns nil" do
          expect(CardDetailsExtractor.extract(nil)).to be_nil
        end
      end

      context "with Stripe::Source (card type)" do
        it "extracts card details from source.card" do
          source = double('Stripe::Source',
            is_a?: false,
            card: double('card',
              last4: '4242',
              exp_year: 2025,
              exp_month: 12,
              brand: 'Visa'
            )
          )
          allow(source).to receive(:is_a?).with(Stripe::Source).and_return(true)
          allow(source).to receive(:type).and_return('card')

          result = CardDetailsExtractor.extract(source)

          expect(result[:last4]).to eq '4242'
          expect(result[:exp_year]).to eq 2025
          expect(result[:exp_month]).to eq 12
          expect(result[:brand]).to eq 'Visa'
        end
      end

      context "with Stripe::Source (non-card type)" do
        it "returns nil for non-card source types" do
          source = double('Stripe::Source')
          allow(source).to receive(:is_a?).with(Stripe::Source).and_return(true)
          allow(source).to receive(:is_a?).with(Stripe::Card).and_return(false)
          allow(source).to receive(:is_a?).with(Stripe::BankAccount).and_return(false)
          allow(source).to receive(:type).and_return('ach_debit')

          expect(CardDetailsExtractor.extract(source)).to be_nil
        end
      end

      context "with Stripe::Card" do
        it "extracts card details directly" do
          card = double('Stripe::Card',
            is_a?: false,
            last4: '1234',
            exp_year: 2026,
            exp_month: 6,
            brand: 'Mastercard'
          )
          allow(card).to receive(:is_a?).with(Stripe::Source).and_return(false)
          allow(card).to receive(:is_a?).with(Stripe::Card).and_return(true)
          allow(card).to receive(:respond_to?).with(:brand).and_return(true)

          result = CardDetailsExtractor.extract(card)

          expect(result[:last4]).to eq '1234'
          expect(result[:exp_year]).to eq 2026
          expect(result[:exp_month]).to eq 6
          expect(result[:brand]).to eq 'Mastercard'
        end

        it "falls back to type when brand is not available" do
          card = double('Stripe::Card',
            is_a?: false,
            last4: '5678',
            exp_year: 2027,
            exp_month: 3,
            type: 'Visa'
          )
          allow(card).to receive(:is_a?).with(Stripe::Source).and_return(false)
          allow(card).to receive(:is_a?).with(Stripe::Card).and_return(true)
          allow(card).to receive(:respond_to?).with(:brand).and_return(false)

          result = CardDetailsExtractor.extract(card)

          expect(result[:brand]).to eq 'Visa'
        end
      end

      context "with Stripe::BankAccount" do
        it "extracts bank account details with nil expiration" do
          bank_account = double('Stripe::BankAccount',
            is_a?: false,
            last4: '6789',
            bank_name: 'Chase'
          )
          allow(bank_account).to receive(:is_a?).with(Stripe::Source).and_return(false)
          allow(bank_account).to receive(:is_a?).with(Stripe::Card).and_return(false)
          allow(bank_account).to receive(:is_a?).with(Stripe::BankAccount).and_return(true)

          result = CardDetailsExtractor.extract(bank_account)

          expect(result[:last4]).to eq '6789'
          expect(result[:brand]).to eq 'Chase'
          expect(result[:exp_year]).to be_nil
          expect(result[:exp_month]).to be_nil
        end
      end

      context "with unknown source type" do
        it "returns nil" do
          unknown = double('Unknown')
          allow(unknown).to receive(:is_a?).with(Stripe::Source).and_return(false)
          allow(unknown).to receive(:is_a?).with(Stripe::Card).and_return(false)
          allow(unknown).to receive(:is_a?).with(Stripe::BankAccount).and_return(false)

          expect(CardDetailsExtractor.extract(unknown)).to be_nil
        end
      end
    end

    describe ".expiration_date" do
      context "with nil input" do
        it "returns nil" do
          expect(CardDetailsExtractor.expiration_date(nil)).to be_nil
        end
      end

      context "with valid details" do
        it "creates a date from year and month" do
          details = { exp_year: 2025, exp_month: 12 }
          result = CardDetailsExtractor.expiration_date(details)

          expect(result).to eq Date.new(2025, 12, 1)
        end

        it "handles string values for year and month" do
          details = { exp_year: '2026', exp_month: '6' }
          result = CardDetailsExtractor.expiration_date(details)

          expect(result).to eq Date.new(2026, 6, 1)
        end
      end
    end
  end
end

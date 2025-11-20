module Payola
  # Shared utility for extracting card details from various Stripe payment source types
  # Handles Stripe::Source, Stripe::Card, and Stripe::BankAccount objects
  class CardDetailsExtractor
    def self.extract(source)
      return nil unless source

      if source.is_a?(Stripe::Source) && source.type == 'card'
        {
          last4: source.card.last4,
          exp_year: source.card.exp_year,
          exp_month: source.card.exp_month,
          brand: source.card.brand
        }
      elsif source.is_a?(Stripe::Card)
        {
          last4: source.last4,
          exp_year: source.exp_year,
          exp_month: source.exp_month,
          brand: source.respond_to?(:brand) ? source.brand : source.type
        }
      elsif source.is_a?(Stripe::BankAccount)
        {
          last4: source.last4,
          exp_year: Date.today.year + 1,
          exp_month: Date.today.month,
          brand: source.bank_name
        }
      else
        nil
      end
    end

    def self.expiration_date(details)
      return nil unless details
      Date.new(details[:exp_year].to_i, details[:exp_month].to_i, 1)
    end
  end
end

module Payola
  class UpdateCard
    def self.call(subscription, token)
      secret_key = Payola.secret_key_for_sale(subscription)
      begin
        Stripe::Customer.update(
          subscription.stripe_customer_id,
          { source: token },
          secret_key
        )

        customer = Stripe::Customer.retrieve(subscription.stripe_customer_id, secret_key)
        source = customer.sources.retrieve(customer.default_source, secret_key)

        card_details = CardDetailsExtractor.extract(source)

        subscription.update(
          card_type: card_details&.dig(:brand),
          card_last4: card_details&.dig(:last4),
          card_expiration: CardDetailsExtractor.expiration_date(card_details)
        )
      rescue RuntimeError, Stripe::StripeError => e
        subscription.errors.add(:base, e.message)
      end

      subscription
    end
  end
end

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
        card = customer.sources.retrieve(customer.default_source, secret_key)

        if card.is_a?(Stripe::Source) && card.type == 'card'
          card_type       = card.card.brand
          card_last4      = card.card.last4
          card_expiration = Date.new(card.card.exp_year, card.card.exp_month, 1)
        else
          card_type       = card.brand
          card_last4      = card.last4
          card_expiration = Date.parse("#{card.exp_year}/#{card.exp_month}/1")
        end

        subscription.update(
          card_type: card_type,
          card_last4: card_last4,
          card_expiration: card_expiration
        )
        subscription.save!
      rescue RuntimeError, Stripe::StripeError => e
        subscription.errors.add(:base, e.message)
      end

      subscription
    end
  end
end

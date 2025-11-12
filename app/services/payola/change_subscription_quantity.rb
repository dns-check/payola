module Payola
  class ChangeSubscriptionQuantity
    def self.call(subscription, quantity)
      secret_key = Payola.secret_key_for_sale(subscription)
      old_quantity = subscription.quantity

      begin
        Stripe::Subscription.update(
          subscription.stripe_id,
          { quantity: quantity },
          secret_key
        )

        subscription.quantity = quantity
        subscription.save!

        subscription.instrument_quantity_changed(old_quantity)

      rescue RuntimeError, Stripe::StripeError => e
        subscription.errors.add(:base, e.message)
      end

      subscription
    end
  end
end

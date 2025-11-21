module Payola
  class CancelSubscription
    def self.call(subscription, options = {})
      secret_key = Payola.secret_key_for_sale(subscription)

      if options[:at_period_end] == true
        # Schedule cancellation at period end via update
        Stripe::Subscription.update(
          subscription.stripe_id,
          { cancel_at_period_end: true },
          secret_key
        )
        subscription.update(cancel_at_period_end: true)
      else
        # Cancel the subscription immediately
        Stripe::Subscription.cancel(subscription.stripe_id, {}, secret_key)
        subscription.cancel!
      end
    end
  end
end

module Payola
  class CancelSubscription
    def self.call(subscription, options = {})
      secret_key = Payola.secret_key_for_sale(subscription)
      Stripe::Subscription.cancel(subscription.stripe_id, options, secret_key)
      
      if options[:at_period_end] == true
        # Store that the subscription will be canceled at the end of the billing period
        subscription.update(cancel_at_period_end: true)
      else
        # Cancel the subscription immediately
        subscription.cancel!
      end
    end
  end
end

module Payola
  class UpdateCustomer
    def self.call(stripe_customer_id, options)
      secret_key = Payola.secret_key
      Stripe::Customer.update(stripe_customer_id, options.to_h, secret_key)
    end
  end
end

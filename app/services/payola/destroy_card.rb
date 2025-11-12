module Payola
  class DestroyCard
    def self.call(card_id, stripe_customer_id)
      secret_key = Payola.secret_key
      Stripe::Customer.delete_source(
        stripe_customer_id,
        card_id,
        {},
        secret_key
      )
    end
  end
end

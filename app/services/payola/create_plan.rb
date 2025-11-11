module Payola
  class CreatePlan
    def self.call(plan)
      secret_key = Payola.secret_key_for_sale(plan)

      begin
        return Stripe::Plan.retrieve(plan.stripe_id, secret_key)
      rescue Stripe::InvalidRequestError
        # fall through
      end

      # Note: Newer Stripe API versions require a product parameter for plan creation.
      # The Stripe API version is configured in lib/payola.rb (defaults to 2015-02-18).
      # However, test mocking libraries may enforce newer API requirements regardless of
      # the configured version. This code provides compatibility with both old and new APIs.
      product_id = "prod_#{plan.stripe_id}"

      begin
        Stripe::Product.retrieve(product_id, secret_key)
      rescue Stripe::InvalidRequestError
        # Product doesn't exist, try to create it
        begin
          Stripe::Product.create({
            id: product_id,
            name: plan.name,
            type: 'service'
          }, secret_key)
        rescue Stripe::InvalidRequestError
          # Product creation failed - likely because the configured API version
          # doesn't support products. This is expected for API versions before 2018.
          # The plan creation below will proceed without the product parameter.
        end
      end

      plan_params = {
        id:                plan.stripe_id,
        amount:            plan.amount,
        interval:          plan.interval,
        name:              plan.name,
        interval_count:    plan.respond_to?(:interval_count) ? plan.interval_count : nil,
        currency:          plan.respond_to?(:currency) ? plan.currency : Payola.default_currency,
        trial_period_days: plan.respond_to?(:trial_period_days) ? plan.trial_period_days : nil
      }

      # Include product parameter if it was successfully created
      begin
        Stripe::Product.retrieve(product_id, secret_key)
        plan_params[:product] = product_id
      rescue Stripe::InvalidRequestError
        # Product doesn't exist, proceed without product parameter
      end

      Stripe::Plan.create(plan_params, secret_key)
    end
  end
end

module Payola
  class ChangeSubscriptionPlan
    def self.call(subscription, plan, quantity = 1, coupon_code = nil, trial_end = nil)
      secret_key = Payola.secret_key_for_sale(subscription)
      old_plan = subscription.plan

      begin
        update_params = {
          plan: plan.stripe_id,
          proration_behavior: should_prorate?(subscription, plan, coupon_code) ? 'create_prorations' : 'none',
          quantity: quantity
        }
        update_params[:coupon] = coupon_code if coupon_code.present?
        update_params[:trial_end] = trial_end if trial_end.present?

        Stripe::Subscription.update(
          subscription.stripe_id,
          update_params,
          secret_key
        )

        subscription.cancel_at_period_end = false
        subscription.plan = plan
        subscription.quantity = quantity
        subscription.save!

        subscription.instrument_plan_changed(old_plan)

      rescue RuntimeError, Stripe::StripeError => e
        subscription.errors.add(:base, e.message)
      end

      subscription
    end

    def self.should_prorate?(subscription, plan, coupon_code)
      prorate = plan.respond_to?(:should_prorate?) ? plan.should_prorate?(subscription) : true
      prorate = false if coupon_code.present?
      prorate
    end
  end
end

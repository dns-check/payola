module Payola
  module StatusBehavior
    extend ActiveSupport::Concern

    def render_payola_status(object)
      head :not_found and return unless object

      errors = ([object.error.presence] + object.errors.full_messages).compact.to_sentence

      response_data = {
        guid:   object.guid,
        status: object.state,
        error:  errors.presence
      }

      # For subscriptions with incomplete status (requires SCA/3DS authentication),
      # include the stripe_status and payment intent client_secret
      if object.is_a?(Payola::Subscription) && object.stripe_status == 'incomplete'
        response_data[:stripe_status] = object.stripe_status
        response_data[:client_secret] = retrieve_payment_intent_client_secret(object)
      end

      render json: response_data, status: errors.blank? ? 200 : 400
    end

    private

    # Retrieve the payment intent client_secret for an incomplete subscription
    # This is needed for the client-side to authenticate with 3D Secure
    def retrieve_payment_intent_client_secret(subscription)
      return nil unless subscription.stripe_id.present?

      begin
        stripe_sub = Stripe::Subscription.retrieve(
          {
            id: subscription.stripe_id,
            expand: ['latest_invoice.payment_intent']
          },
          Payola.secret_key_for_sale(subscription)
        )

        stripe_sub.latest_invoice&.payment_intent&.client_secret
      rescue Stripe::StripeError => e
        Rails.logger.error "Failed to retrieve payment intent for subscription #{subscription.guid}: #{e.message}"
        nil
      end
    end
  end
end


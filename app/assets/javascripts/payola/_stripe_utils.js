// Shared Stripe.js v3 utilities for Payola
var PayolaStripe = {
    // Get the global Stripe instance
    getStripe: function() {
        if (typeof payolaStripe !== 'undefined') {
            return payolaStripe;
        }
        return null;
    },

    // Create and mount separate Stripe Card Elements (cardNumber, cardExpiry, cardCvc)
    // Returns the cardNumber element (used for tokenization), or null if Stripe is not initialized
    // If errorElement is provided, attaches change listeners to display validation errors
    createCardElements: function(numberMount, expiryMount, cvcMount, options, errorElement) {
        var stripe = PayolaStripe.getStripe();
        if (!stripe) return null;

        var elements = stripe.elements();
        var numberOptions = $.extend({}, options || {}, { showIcon: true });
        var cardNumber = elements.create('cardNumber', numberOptions);
        var cardExpiry = elements.create('cardExpiry', options || {});
        var cardCvc = elements.create('cardCvc', options || {});

        cardNumber.mount(numberMount);
        cardExpiry.mount(expiryMount);
        cardCvc.mount(cvcMount);

        // Attach error display listener if errorElement provided
        if (errorElement) {
            var handleError = function(event) {
                if (typeof errorElement === 'string') {
                    errorElement = document.querySelector(errorElement);
                }
                if (errorElement) {
                    errorElement.textContent = event.error ? event.error.message : '';
                }
            };

            cardNumber.on('change', handleError);
            cardExpiry.on('change', handleError);
            cardCvc.on('change', handleError);
        }

        return cardNumber;
    },

    // Mount Card Elements on forms matching a selector
    // Uses separate elements: #card-number, #card-expiry, #card-cvc
    // Returns the cardNumber element reference (Stripe uses it to find related elements during tokenization)
    mountCardElements: function(formSelector, cardElementsStore) {
        $(formSelector).each(function() {
            var form = $(this);
            var formId = form.attr('id') || 'default';

            if (cardElementsStore[formId]) return;

            var numberMount = form.find('#card-number')[0];
            var expiryMount = form.find('#card-expiry')[0];
            var cvcMount = form.find('#card-cvc')[0];
            var errorElement = form.find('#card-errors')[0];

            if (numberMount && expiryMount && cvcMount) {
                var options = {
                    style: {
                        base: {
                            '::placeholder': {
                                color: '#999'
                            }
                        }
                    }
                };
                var cardNumber = PayolaStripe.createCardElements(
                    numberMount, expiryMount, cvcMount, options, errorElement
                );
                if (cardNumber) {
                    cardElementsStore[formId] = cardNumber;
                }
            }
        });
    },

    // Create a Stripe token from a Card Element
    // Calls onSuccess(token) or onError(message)
    createToken: function(cardElement, onSuccess, onError) {
        var stripe = PayolaStripe.getStripe();
        if (!stripe) {
            onError("Stripe.js not initialized. Please refresh the page.");
            return;
        }

        stripe.createToken(cardElement).then(function(result) {
            if (result.error) {
                onError(result.error.message);
            } else {
                onSuccess(result.token);
            }
        });
    }
};

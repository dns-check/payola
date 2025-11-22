// Shared Stripe.js v3 utilities for Payola
var PayolaStripe = {
    // Get the global Stripe instance
    getStripe: function() {
        if (typeof payolaStripe !== 'undefined') {
            return payolaStripe;
        }
        return null;
    },

    // Create and mount a Stripe Card Element
    // Returns the card element, or null if Stripe is not initialized
    // If errorElement is provided, attaches a change listener to display validation errors
    createCardElement: function(mountPoint, options, errorElement) {
        var stripe = PayolaStripe.getStripe();
        if (!stripe) return null;

        var elements = stripe.elements();
        var card = elements.create('card', options || {});
        card.mount(mountPoint);

        // Attach error display listener if errorElement provided
        if (errorElement) {
            card.on('change', function(event) {
                if (typeof errorElement === 'string') {
                    errorElement = document.querySelector(errorElement);
                }
                if (errorElement) {
                    errorElement.textContent = event.error ? event.error.message : '';
                }
            });
        }

        return card;
    },

    // Mount Card Elements on forms matching a selector
    // Returns an object mapping form IDs to card elements
    mountCardElements: function(formSelector, cardElementsStore) {
        $(formSelector).each(function() {
            var form = $(this);
            var formId = form.attr('id') || 'default';
            var mountPoint = form.find('#card-element')[0];
            var errorElement = form.find('#card-errors')[0];

            if (mountPoint && !cardElementsStore[formId]) {
                var cardElement = PayolaStripe.createCardElement(mountPoint, null, errorElement);
                if (cardElement) {
                    cardElementsStore[formId] = cardElement;
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

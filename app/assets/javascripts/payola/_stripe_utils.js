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
    },

    // Validate card number using Luhn algorithm
    validateCardNumber: function(number) {
        if (!number) return false;
        number = number.replace(/\s/g, '');
        if (!/^\d{13,19}$/.test(number)) return false;

        var sum = 0;
        var isEven = false;
        for (var i = number.length - 1; i >= 0; i--) {
            var digit = parseInt(number[i], 10);
            if (isEven) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
            isEven = !isEven;
        }
        return sum % 10 === 0;
    },

    // Validate expiration date
    validateExpiry: function(month, year) {
        if (!month || !year) return false;
        month = parseInt(month, 10);
        year = parseInt(year, 10);
        if (month < 1 || month > 12) return false;
        // Handle 2-digit years
        if (year < 100) year += 2000;
        var now = new Date();
        var expiry = new Date(year, month);
        return expiry > now;
    },

    // Validate CVC
    validateCVC: function(cvc) {
        if (!cvc) return false;
        return /^\d{3,4}$/.test(cvc);
    }
};

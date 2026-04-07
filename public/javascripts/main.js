(function () {
    function attachToggle(toggleBtn, passwordInput) {
        if (!toggleBtn || !passwordInput) return;

        var eyeOpen = toggleBtn.querySelector(".icon-eye--open");
        var eyeClosed = toggleBtn.querySelector(".icon-eye--closed");

        toggleBtn.addEventListener("click", function () {
            var isHidden = passwordInput.type === "password";
            passwordInput.type = isHidden ? "text" : "password";
            toggleBtn.setAttribute("aria-pressed", isHidden ? "true" : "false");
            toggleBtn.setAttribute(
                "aria-label",
                isHidden ? "Hide password" : "Show password"
            );

            if (eyeOpen && eyeClosed) {
                eyeOpen.hidden = isHidden;
                eyeClosed.hidden = !isHidden;
            }
        });
    }

    var dataToggles = document.querySelectorAll("[data-toggle-password]");
    if (dataToggles.length) {
        dataToggles.forEach(function (btn) {
            var targetId = btn.getAttribute("data-target");
            if (!targetId) return;
            var input = document.getElementById(targetId);
            attachToggle(btn, input);
        });
        return;
    }

    var fallbackInput = document.getElementById("signin-password");
    var fallbackToggle = document.getElementById("toggle-password");
    attachToggle(fallbackToggle, fallbackInput);
})();

(function () {
    var passwordInput = document.getElementById("signup-password");
    if (!passwordInput) return;

    var rules = {
        minLength: document.querySelector('[data-password-rule="minLength"]'),
        number: document.querySelector('[data-password-rule="number"]'),
        uppercase: document.querySelector('[data-password-rule="uppercase"]'),
        special: document.querySelector('[data-password-rule="special"]')
    };

    function paintRule(el, isValid, isTyping) {
        if (!el) return;

        if (!isTyping) {
            el.style.color = "";
            return;
        }

        el.style.color = isValid ? "#4ade80" : "#ef4444";
    }

    function validatePassword(password) {
        var hasValue = password.length > 0;

        paintRule(rules.minLength, password.length >= 8, hasValue);
        paintRule(rules.number, /\d/.test(password), hasValue);
        paintRule(rules.uppercase, /[A-Z]/.test(password), hasValue);
        paintRule(rules.special, /[^A-Za-z0-9]/.test(password), hasValue);
    }

    passwordInput.addEventListener("input", function () {
        validatePassword(passwordInput.value);
    });

    validatePassword(passwordInput.value || "");
})();

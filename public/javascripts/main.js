// show/ hide password when sign in
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
        Array.prototype.forEach.call(dataToggles, function (btn) {
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

// Validate password
(function () {
    var passwordInput = document.getElementById("signup-password");
    if (!passwordInput) return;

    function closestSafe(el, selector) {
        if (!el) return null;
        if (typeof closestEl === "function") return closestEl(el, selector);
        if (el.closest) return el.closest(selector);
        return null;
    }

    function meetsPasswordRules(value) {
        var pw = value || "";
        if (typeof passwordMeetsSignupRules === "function") {
            try {
                return !!passwordMeetsSignupRules(pw);
            } catch (e) {
                // fall back to local rules below
            }
        }
        return (
            pw.length >= 8 &&
            /\d/.test(pw) &&
            /[A-Z]/.test(pw) &&
            /[^A-Za-z0-9]/.test(pw)
        );
    }

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

        var wrap = closestSafe(passwordInput, ".input-wrap");
        if (wrap && meetsPasswordRules(password)) {
            wrap.classList.remove("input-wrap--invalid");
            passwordInput.removeAttribute("aria-invalid");
        }
    }

    passwordInput.addEventListener("input", function () {
        validatePassword(passwordInput.value);
    });

    validatePassword(passwordInput.value || "");
})();

// Validate signup form fields (username, password, confirm password)
(function () {
    var form = document.querySelector("form.signup-form");
    if (!form) return;

    var usernameInput = form.querySelector('input[name="username"]');
    var passwordInput = form.querySelector("#signup-password");
    var confirmInput = form.querySelector("#signup-confirm-password");
    var termsInput = form.querySelector('input[name="terms"]');
    var termsWrap = document.getElementById("signup-terms-wrap");

    var usernameError = document.getElementById("signup-username-error");
    var passwordError = document.getElementById("signup-password-error");
    var confirmError = document.getElementById("signup-confirm-password-error");
    var termsError = document.getElementById("signup-terms-error");

    function closestSafe(el, selector) {
        if (!el) return null;
        if (typeof closestEl === "function") return closestEl(el, selector);
        if (el.closest) return el.closest(selector);
        return null;
    }

    function setFieldError(inputEl, errorEl, message) {
        if (!inputEl || !errorEl) return;
        var wrap = closestSafe(inputEl, ".input-wrap");

        if (message) {
            errorEl.textContent = message;
            errorEl.hidden = false;
            if (wrap) wrap.classList.add("input-wrap--invalid");
            inputEl.setAttribute("aria-invalid", "true");
        } else {
            errorEl.textContent = "";
            errorEl.hidden = true;
            if (wrap) wrap.classList.remove("input-wrap--invalid");
            inputEl.removeAttribute("aria-invalid");
        }
    }

    function usernameIsOneWord(value) {
        var v = (value || "").trim();
        return v.length > 0 && !/\s/.test(v);
    }

    function meetsPasswordRules(value) {
        if (typeof passwordMeetsSignupRules === "function") {
            return !!passwordMeetsSignupRules(value || "");
        }
        var pw = value || "";
        return (
            pw.length >= 8 &&
            /\d/.test(pw) &&
            /[A-Z]/.test(pw) &&
            /[^A-Za-z0-9]/.test(pw)
        );
    }

    function validateAll() {
        var ok = true;

        if (usernameInput) {
            var usernameOk = usernameIsOneWord(usernameInput.value);
            setFieldError(
                usernameInput,
                usernameError,
                usernameOk ? "" : "Username must be 1 word (no spaces)."
            );
            ok = ok && usernameOk;
        }

        if (passwordInput) {
            var pwOk = meetsPasswordRules(passwordInput.value);
            setFieldError(
                passwordInput,
                passwordError,
                pwOk ? "" : "Password does not meet the requirements."
            );
            ok = ok && pwOk;
        }

        if (confirmInput && passwordInput) {
            var confirmOk =
                (confirmInput.value || "") === (passwordInput.value || "");
            setFieldError(
                confirmInput,
                confirmError,
                confirmOk ? "" : "Confirm password must match password."
            );
            ok = ok && confirmOk;
        }

        if (termsInput && termsError) {
            var termsOk = !!termsInput.checked;
            termsError.textContent = termsOk ? "" : "You must agree to the Terms.";
            termsError.hidden = termsOk;
            if (termsWrap) {
                if (termsOk) termsWrap.classList.remove("remember--invalid");
                else termsWrap.classList.add("remember--invalid");
            }
            if (termsOk) termsInput.removeAttribute("aria-invalid");
            else termsInput.setAttribute("aria-invalid", "true");
            ok = ok && termsOk;
        }

        return ok;
    }

    // live validation
    if (usernameInput) {
        usernameInput.addEventListener("input", function () {
            setFieldError(
                usernameInput,
                usernameError,
                usernameIsOneWord(usernameInput.value)
                    ? ""
                    : "Username must be 1 word (no spaces)."
            );
        });
        usernameInput.addEventListener("blur", function () {
            validateAll();
        });
    }

    if (passwordInput) {
        passwordInput.addEventListener("blur", function () {
            validateAll();
        });
        passwordInput.addEventListener("input", function () {
            // keep confirm in sync if user edits password after confirm
            if (confirmInput && confirmInput.value) {
                setFieldError(
                    confirmInput,
                    confirmError,
                    confirmInput.value === passwordInput.value
                        ? ""
                        : "Confirm password must match password."
                );
            }
        });
    }

    if (confirmInput) {
        confirmInput.addEventListener("input", function () {
            if (!passwordInput) return;
            setFieldError(
                confirmInput,
                confirmError,
                confirmInput.value === passwordInput.value
                    ? ""
                    : "Confirm password must match password."
            );
        });
        confirmInput.addEventListener("blur", function () {
            validateAll();
        });
    }

    if (termsInput) {
        termsInput.addEventListener("change", function () {
            validateAll();
        });
    }

    form.addEventListener("submit", function (e) {
        if (!validateAll()) {
            e.preventDefault();
        }
    });
})();

//search user engine
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.querySelector(".admin-search__input");
    const rows = document.querySelectorAll(".admin-table tbody tr");

    if (!searchInput) return;

    searchInput.addEventListener("input", function () {
        const keyword = this.value.trim().toLowerCase();

        rows.forEach(row => {
            const id = row.children[0]?.innerText.toLowerCase() || "";
            const name = row.children[1]?.innerText.toLowerCase() || "";
            const username = row.children[2]?.innerText.toLowerCase() || "";
            const email = row.children[3]?.innerText.toLowerCase() || "";

            const match =
                id.includes(keyword) ||
                name.includes(keyword) ||
                username.includes(keyword) ||
                email.includes(keyword);

            row.style.display = match ? "" : "none";
        });
    });
});

// View page interactions
document.addEventListener("DOMContentLoaded", function () {
    const editBtn = document.querySelector(".admin-view-profile__edit");
    const deleteButtons = document.querySelectorAll(".admin-view-delete");

    if (editBtn) {
        editBtn.addEventListener("click", function () {
            window.alert("Edit profile action is not implemented yet.");
        });
    }

    if (!deleteButtons.length) return;

    deleteButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            const row = btn.closest("tr");
            if (!row) return;

            const ok = window.confirm("Delete this uploaded match?");
            if (!ok) return;

            row.remove();
        });
    });
});

// Restrict Users nav on Dashboard/Matches
document.addEventListener("DOMContentLoaded", function () {
    const blockedUserLinks = document.querySelectorAll("[data-users-nav-popup]");
    if (!blockedUserLinks.length) return;

    blockedUserLinks.forEach(function (link) {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            window.alert('Please choose "view" a user in Dashboard. Thank you');
        });
    });
});

// Landing (home): parallax backgrounds + subtle foreground drift on scroll
document.addEventListener("DOMContentLoaded", function () {
    if (!document.body.classList.contains("page-home")) return;

    var heroBg = document.querySelector('[data-home-parallax-bg="hero"]');
    var featuresBg = document.querySelector('[data-home-parallax-bg="features"]');
    var heroVisual = document.querySelector("[data-home-parallax]");
    var featuresSection = document.getElementById("features");

    function prefersReducedMotion() {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function updateParallax() {
        if (prefersReducedMotion()) {
            if (heroBg) heroBg.style.transform = "";
            if (featuresBg) featuresBg.style.transform = "";
            if (heroVisual) heroVisual.style.transform = "";
            return;
        }

        var y = window.scrollY || window.pageYOffset;

        if (heroBg) {
            heroBg.style.transform = "translate3d(0," + y * 0.22 + "px,0)";
        }

        if (featuresBg && featuresSection) {
            var rel = Math.max(0, y - featuresSection.offsetTop + window.innerHeight * 0.12);
            featuresBg.style.transform = "translate3d(0," + rel * 0.16 + "px,0)";
        }

        if (heroVisual) {
            var speed = parseFloat(heroVisual.getAttribute("data-home-parallax") || "0.04");
            if (isNaN(speed)) speed = 0.04;
            heroVisual.style.transform = "translate3d(0," + -y * speed + "px,0)";
        }
    }

    window.addEventListener("scroll", updateParallax, { passive: true });
    window.addEventListener("resize", updateParallax, { passive: true });
    updateParallax();
});
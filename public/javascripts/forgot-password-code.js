(function () {
    var form = document.querySelector("[data-otp-form]");
    if (!form) return;

    var hidden = document.getElementById("fp-code");
    var cells = form.querySelectorAll("[data-otp-digit]");
    if (!hidden || !cells.length) return;

    var len = cells.length;

    function syncHidden() {
        var v = "";
        for (var i = 0; i < len; i++) {
            v += (cells[i].value || "").replace(/\D/g, "").slice(-1) || "";
        }
        hidden.value = v;
    }

    function focusAt(index) {
        if (index < 0) index = 0;
        if (index >= len) index = len - 1;
        var cell = cells[index];
        cell.focus();
        try {
            var n = (cell.value || "").length;
            if (n) {
                cell.setSelectionRange(0, 1);
            } else {
                cell.setSelectionRange(0, 0);
            }
        } catch (e) {
            /* ignore */
        }
    }

    function setDigit(cell, ch) {
        cell.value = ch ? ch.slice(-1) : "";
    }

    Array.prototype.forEach.call(cells, function (cell, index) {
        cell.addEventListener("keydown", function (e) {
            var key = e.key;
            if (key === "Backspace") {
                if (cell.value) {
                    cell.value = "";
                    syncHidden();
                } else if (index > 0) {
                    e.preventDefault();
                    focusAt(index - 1);
                    cells[index - 1].value = "";
                    syncHidden();
                }
                return;
            }
            if (key === "ArrowLeft" && index > 0) {
                e.preventDefault();
                focusAt(index - 1);
                return;
            }
            if (key === "ArrowRight" && index < len - 1) {
                e.preventDefault();
                focusAt(index + 1);
                return;
            }
            if (key === "Enter") {
                return;
            }
        });

        cell.addEventListener("input", function () {
            var d = (cell.value || "").replace(/\D/g, "");
            if (!d) {
                cell.value = "";
                syncHidden();
                return;
            }
            setDigit(cell, d.charAt(0));
            syncHidden();
            if (d.length > 1) {
                var rest = d.slice(1);
                var j = index + 1;
                for (var k = 0; k < rest.length && j < len; k++, j++) {
                    setDigit(cells[j], rest.charAt(k));
                }
                syncHidden();
                focusAt(Math.min(j, len - 1));
            } else if (index < len - 1) {
                focusAt(index + 1);
            }
        });

        cell.addEventListener("paste", function (e) {
            e.preventDefault();
            var text = (e.clipboardData || window.clipboardData).getData("text") || "";
            var digits = text.replace(/\D/g, "").slice(0, len);
            for (var i = 0; i < len; i++) {
                setDigit(cells[i], digits.charAt(i) || "");
            }
            syncHidden();
            var next = Math.min(digits.length, len - 1);
            focusAt(next);
        });

        cell.addEventListener("focus", function () {
            if (cell.value) {
                try {
                    cell.setSelectionRange(0, 1);
                } catch (err) {
                    /* ignore */
                }
            }
        });
    });

    form.addEventListener("submit", function (e) {
        syncHidden();
        if (hidden.value.length !== len) {
            e.preventDefault();
            for (var i = 0; i < len; i++) {
                if (!(cells[i].value || "").trim()) {
                    focusAt(i);
                    return;
                }
            }
            focusAt(0);
        }
    });

    syncHidden();
    focusAt(0);
})();

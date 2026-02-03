frappe.ready(function () {
    console.log("✅ KYC Web Form script loaded");

   
    // =============================
    // Helpers
    // =============================
    function show_error(msg) {
        frappe.msgprint({
            title: "Validation Error",
            message: msg,
            indicator: "red"
        });
    }

    function is_valid_email(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function is_past_date(date_str) {
        const selected = new Date(date_str);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return selected < today;
    }

    function toggle_field(fieldname, show) {
        const field = frappe.web_form.fields_dict[fieldname];
        if (field) field.$wrapper.toggle(show);
    }

    function restrict_input(fieldname, handler) {
        const field = frappe.web_form.fields_dict[fieldname];
        if (field && field.$input) {
            field.$input.on('input', handler);
        }
    }

    const short_addr = frappe.web_form.get_value('short_national_address');

    if (short_addr) {
        const letters = (short_addr.match(/[A-Z]/g) || []).length;
        const digits = (short_addr.match(/\d/g) || []).length;

        if (letters !== 4 || digits !== 4) {
            show_error(
                "Short National Address must contain exactly 4 letters and 4 digits (order does not matter)."
            );
            return false;
        }
    }

    frappe.web_form.on('cr_expiry_date', function () {
    const value = frappe.web_form.get_value('cr_expiry_date');
    if (!value) return;

    console.log(value)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selected = new Date(value);

    if (selected < today) {
        frappe.msgprint("Past dates are not allowed. Resetting to today.");
        frappe.web_form.set_value(
            'cr_expiry_date',
            frappe.datetime.get_today()
        );
    }
});




    // =============================
    // Show / Hide Warehouses
    // =============================
    function toggle_locations() {
        const count = cint(frappe.web_form.get_value('delivery_locations_in_ksa')) || 0;

        toggle_field('warehouse_city', count >= 1);
        toggle_field('district', count >= 1);

        for (let i = 2; i <= 20; i++) {
            toggle_field(`custom_warehouse_city_${i}`, count >= i);
            toggle_field(`custom_district_${i}`, count >= i);
        }
    }

    frappe.web_form.on('delivery_locations_in_ksa', toggle_locations);
    toggle_locations();

    // =============================
    // Typing Restrictions
    // =============================
    restrict_input('commercial_registration_cr', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 10);
    });

    ['mobile', 'mobile_number', 'mobile_number_2', 'id'].forEach(f => {
        restrict_input(f, function () {
            this.value = this.value.replace(/\D/g, '').slice(0, 10);
        });
    });

    restrict_input('vat_number', function () {
        this.value = this.value.replace(/\D/g, '').slice(0, 15);
    });

    restrict_input('short_national_address', function () {
        let value = this.value.toUpperCase();

        // Keep only letters & digits
        value = value.replace(/[^A-Z0-9]/g, '');

        let letters = '';
        let digits = '';

        // Preserve typing order, but limit counts
        for (const ch of value) {
            if (/[A-Z]/.test(ch) && letters.length < 4) {
                letters += ch;
            } else if (/\d/.test(ch) && digits.length < 4) {
                digits += ch;
            }
        }

        // Rebuild value in the SAME order user typed
        let result = '';
        for (const ch of value) {
            if (/[A-Z]/.test(ch) && letters.includes(ch)) {
                result += ch;
                letters = letters.replace(ch, '');
            } else if (/\d/.test(ch) && digits.includes(ch)) {
                result += ch;
                digits = digits.replace(ch, '');
            }
            if (result.length === 8) break;
        }

        this.value = result;
    });



    ['email', 'finance_email_for_invoicing_2'].forEach(f => {
        restrict_input(f, function () {
            this.value = this.value.replace(/\s/g, '');
        });
    });

    // =============================
    // FINAL SUBMIT VALIDATION
    // =============================
    frappe.web_form.validate = function () {

        const count = cint(frappe.web_form.get_value('delivery_locations_in_ksa')) || 0;

        // --- Warehouse/District required ---
        if (count >= 1) {
            if (!frappe.web_form.get_value('warehouse_city') ||
                !frappe.web_form.get_value('district')) {
                show_error("Warehouse City and District are required for Location 1.");
                return false;
            }
        }

        for (let i = 2; i <= count; i++) {
            if (!frappe.web_form.get_value(`custom_warehouse_city_${i}`) ||
                !frappe.web_form.get_value(`custom_district_${i}`)) {
                show_error(`Warehouse City and District are required for Location ${i}.`);
                return false;
            }
        }

        // --- Expiry Date ---
        const expiry = frappe.web_form.get_value('cr_expiry_date');
        if (expiry && is_past_date(expiry)) {
            show_error("CR Expiry Date cannot be in the past.");
            return false;
        }

        // --- Email validations ---
        const email = frappe.web_form.get_value('email');
        if (email && !is_valid_email(email)) {
            show_error("Please enter a valid email address.");
            return false;
        }

        const finance_email = frappe.web_form.get_value('finance_email_for_invoicing_2');
        if (finance_email && !is_valid_email(finance_email)) {
            show_error("Please enter a valid finance email address.");
            return false;
        }

        return true; // ✅ submit allowed
    };
});



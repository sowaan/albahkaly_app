frappe.ui.form.on("KYC Request", {

    refresh(frm) {
        if (!frm.is_new() && !frm.doc.created_customer) {
            frm.add_custom_button(
                __("Create Customer"),
                () => {
                    frappe.call({
                        method: "albahkaly.albahkaly_app.doctype.kyc_request.kyc_request.create_customer_from_kyc",
                        args: { kyc_name: frm.doc.name },
                        freeze: true,
                        freeze_message: __("Creating Customer...")
                    }).then(r => {
                        if (r.message) {
                            frappe.msgprint(
                                __("Customer Created: {0}", [r.message])
                            );
                            frm.reload_doc();
                        }
                    });
                }
            );
        }

        update_warehouse_visibility(frm);
    },

    delivery_locations_in_ksa(frm) {
        update_warehouse_visibility(frm);
    }
});


function update_warehouse_visibility(frm) {

    let count = parseInt(frm.doc.delivery_locations_in_ksa || "1", 10);

    // Base fields (location 1)
    frm.toggle_display("custom_warehouse_city", true);
    frm.toggle_display("custom_district", true);

    // Indexed locations start from 2
    for (let i = 2; i <= 20; i++) {
        console.log(i);
        
        let show = i <= count;

        let city = `custom_warehouse_city_${i}`;
        let district = `custom_district_${i}`;

        frm.toggle_display(city, show);
        frm.toggle_display(district, show);

        // Clear hidden values
        if (!show) {
            frm.set_value(city, "");
            frm.set_value(district, "");
        }
    }
}

frappe.ui.form.on("KYC Request", {
    refresh(frm) {
        allow_only_numbers(frm, "commercial_registration_cr", 10);
        allow_only_numbers(frm, "vat_number", 15);
        allow_only_numbers(frm, "mobile", 10);
        allow_only_numbers(frm, "mobile_number_2", 10);
        allow_only_numbers(frm, "id", 10);
    }
});

function allow_only_numbers(frm, fieldname, max_length) {

    let field = frm.fields_dict[fieldname];
    if (!field || !field.$input) return;

    field.$input
        .attr("maxlength", max_length)
        .on("input", function () {
            // Remove non-numeric characters
            this.value = this.value.replace(/\D/g, "");

            // Enforce max length
            if (this.value.length > max_length) {
                this.value = this.value.slice(0, max_length);
            }
        });
}



// frappe.ready(function () {
//     console.log("Web Form script loaded"); // 🔍 MUST print

//     frappe.web_form.on('delivery_locations_in_ksa', function () {
//         const count = cint(frappe.web_form.get_value('delivery_locations_in_ksa')) || 0;
//         console.log("Selected count:", count);

//         frappe.web_form.toggle_display('warehouse_city', count >= 1);
//         frappe.web_form.toggle_display('district', count >= 1);

//         for (let i = 2; i <= 20; i++) {
//             const show = count >= i;
//             frappe.web_form.toggle_display(`custom_warehouse_city_${i}`, show);
//             frappe.web_form.toggle_display(`custom_district_${i}`, show);
//         }
//     });

//     // Trigger once on load
//     frappe.web_form.trigger('delivery_locations_in_ksa');
// });




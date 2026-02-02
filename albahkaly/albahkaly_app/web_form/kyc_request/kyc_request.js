frappe.ready(function () {
    //console.log("✅ Web Form JS loaded");

    function toggle_field(fieldname, show) {
        const field = frappe.web_form.fields_dict[fieldname];
        if (!field) return;

        field.$wrapper.toggle(show);
    }

    function toggle_locations() {
        const count = cint(frappe.web_form.get_value('delivery_locations_in_ksa')) || 0;
        //console.log("Count:", count);

        toggle_field('warehouse_city', count >= 1);
        toggle_field('district', count >= 1);

        for (let i = 2; i <= 20; i++) {
            toggle_field(`custom_warehouse_city_${i}`, count >= i);
            toggle_field(`custom_district_${i}`, count >= i);
        }
    }

    // Field change
    frappe.web_form.on('delivery_locations_in_ksa', toggle_locations);

    // On load
    toggle_locations();
});

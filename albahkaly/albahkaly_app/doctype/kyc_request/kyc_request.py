import frappe
from frappe.model.document import Document
import re
import frappe
from frappe.model.document import Document
from frappe.utils import getdate, today
from frappe.utils import validate_email_address

class KYCRequest(Document):

    def validate(self):

        # Commercial Registration – 10 digits
        if self.commercial_registration_cr:
            if not re.fullmatch(r"\d{10}", self.commercial_registration_cr):
                frappe.throw(
                    "Commercial Registration must be exactly 10 digits"
                )

        # CR Expiry Date – today or future only
        if self.cr_expiry_date:
            if getdate(self.cr_expiry_date) < getdate(today()):
                frappe.throw(
                    "CR Expiry Date cannot be in the past"
                )

        # VAT Number – 15 digits
        if self.vat_number:
            if not re.fullmatch(r"\d{15}", self.vat_number):
                frappe.throw(
                    "VAT Number must be exactly 15 digits"
                )

        # Short National Address – 4 letters + 4 digits
        if self.short_national_address:
            if not re.fullmatch(r"[A-Za-z]{4}\d{4}", self.short_national_address):
                frappe.throw(
                    "Short National Address must be 4 letters followed by 4 digits (e.g. ABCD1234)"
                )

        if self.id:
            if not re.fullmatch(r"\d{10}", self.id):
                frappe.throw(
                    "ID must be exactly 10 digits"
                )
        
        if self.mobile:
            if not re.fullmatch(r"\d{10}", self.mobile):
                frappe.throw(
                    "Mobile must be exactly 10 digits"
                )
        
        if self.mobile_number_2:
            if not re.fullmatch(r"\d{10}", self.mobile_number_2):
                frappe.throw(
                    "Mobile 2 must be exactly 10 digits"
                )
        
        if self.email:
            validate_email_address(self.email, throw=True)
        
        count = int(self.delivery_locations_in_ksa or 0)

        if count >= 1 and (not self.warehouse_city or not self.district):
            frappe.throw("Warehouse and District are required for location 1")
        
        for i in range(2, count + 1):
            if not self.get(f"custom_warehouse_city_{i}") or not self.get(f"custom_district_{i}"):
                frappe.throw(f"Warehouse and District are required for location {i}")


    def before_insert(self):
        self.created_customer = None



@frappe.whitelist()
def create_customer_from_kyc(kyc_name):

    doc = frappe.get_doc("KYC Request", kyc_name)

    # 🔒 Prevent duplicate action
    if doc.get("created_customer"):
        frappe.throw(
            f"Customer already created: {doc.created_customer}"
        )
    frappe.msgprint(f"Entity Name {doc.entity_name } Customer Type {doc.customer_type}")

    # Mandatory fields
    if not doc.entity_name or not doc.customer_type:
        frappe.throw("Entity Name and Customer Type are required")

    # 🔍 DUPLICATION CHECK
    existing_customer = frappe.db.exists(
        "Customer",
        {
            "customer_name": doc.entity_name,
            "customer_type": doc.customer_type,
        }
    )

    if existing_customer:
        frappe.throw(
            f"Customer already exists: {existing_customer}"
        )

    # ✅ Create Customer
    customer = frappe.new_doc("Customer")
    customer.customer_name = doc.entity_name
    customer.customer_type = doc.customer_type

    FIELD_MAP = {
        "entity_name": "customer_name",
        "entity_name_arabic": "custom_entity_name_arabic",
        "unified_registration_number": "custom_unified_registration_number",
        "activities": "custom_activities",
        "trade_brand_name": "custom_trade_brand_name",
        "vat_number": "custom_vat_number",
        "entity_type": "custom_entity_type",
        "commercial_registration_cr": "custom_commercial_registration_cr",
        "cr_expiry_date": "custom_cr_expiry_date",

        "building_number": "custom_building_number",
        "street_name": "custom_street_name",
        "region": "custom_region",
        "city": "custom_city",
        "postal_code": "custom_postal_code",
        "additional_number": "custom_additional_number",
        "unit_number":"custom_unit_number",
        "short_national_address": "custom_short_national_address",
		
        "name1": "custom_name",
        "id": "custom_id",
        "nationality": "custom_nationality",
        "job": "custom_job",
        "mobile_number":"custom_mobile_number",
        "email":"custom_email",
		"mobile": "custom_mobile",

        "department": "custom_department",
        "name_of_responsible_person": "custom_name_of_responsible_person",
        "finance_email_for_invoicing": "custom_finance_email_for_invoicing",
        
        "department_2": "custom_department_2",
        "name_of_responsible_person_2": "custom_name_of_responsible_person_2",
        "finance_email_for_invoicing_2": "custom_finance_email_for_invoicing_2",
		"email_2": "custom_email_2",
        "mobile_number_2": "custom_mobile_number_2",		

        "expected_shipments_monthly_import": "custom_expected_shipments_monthly_import",
        "expected_shipments_monthly_export": "custom_expected_shipments_monthly_export",
        "delivery_locations_in_ksa": "custom_delivery_locations_in_ksa",
        "shipment_type": "custom_shipment_type",		
        
        "warehouse_city": "custom_warehouse_city",
        "district": "custom_district",
        "remarks": "custom_comments",
    }
	
    ATTACH_FIELD_MAP = {
    "commercial_register_cr_": "custom_commercial_register_cr_",
    "identities_of_authorized_signatories": "custom_identities_of_authorized_signatories",
    "vat_registration_certificate": "custom_vat_registration_certificate",
    "national_address": "custom_customer_national_address",
    "busniess_licenses": "custom_busniess_licenses",
}

    for kyc_field, customer_field in FIELD_MAP.items():
        if doc.get(kyc_field) is not None:
            customer.set(customer_field, doc.get(kyc_field))

    for kyc_field, customer_field in ATTACH_FIELD_MAP.items():
        if doc.get(kyc_field):
            customer.set(customer_field, doc.get(kyc_field))
    

    # value = doc.get("delivery_locations_in_ksa")

    # if value is not None:
    #     customer.set("custom_delivery_locations_in_ksa", str(value))
    
    # =================================================
    # 🔥 WAREHOUSE CHILD TABLE MAPPING (NEW)
    # =================================================
    customer.set("custom_warehouse", [])

    count = int(doc.delivery_locations_in_ksa or 0)

    if count >= 1:
        # Location 1 (base fields)
        row = customer.append("custom_warehouse", {})
        row.warehouse = doc.warehouse_city
        row.district = doc.district

    # Locations 2 .. N
    for i in range(2, count + 1):
        row = customer.append("custom_warehouse", {})
        row.warehouse = doc.get(f"custom_warehouse_city_{i}")
        row.district = doc.get(f"custom_district_{i}")

    customer.custom_kyc_request_reference = doc.name   
    customer.insert(ignore_permissions=True)

    # 🔁 Save reference back to KYC
    doc.db_set("created_customer", customer.name)

    return customer.name


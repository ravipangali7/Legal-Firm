# **eSewa Web Integration**

**This document explains how to integrate eSewa ePay for web, based on:**

- **Official documentation: [https://developer.esewa.com.np/pages/Epay](https://developer.esewa.com.np/pages/Epay)**  
- **Your provided screenshot of the same page**  
- **The copied specification content you shared**

---

## **1 What eSewa ePay Does**

**eSewa ePay lets a merchant website collect payment from users with an eSewa account by redirecting them to eSewa's hosted payment page and then back to merchant URLs.**

**Core model:**

1. **Merchant creates payment request  signature.**
2. **Customer is redirected to eSewa and authenticates.**
3. **Customer confirms payment.**
4. **eSewa redirects customer back to merchant success/failure URL.**
5. **Merchant verifies result integrity and performs status verification to avoid fraud.**

---

## **2 End-to-End Transaction Flow**

1. **Customer chooses eSewa on merchant checkout page.**
2. **Merchant server generates:**

- **transactionuuid (unique per payment attempt)**  
- **totalamount**  
- **signature using HMAC-SHA256  Base64**

1. **Merchant serves or auto-submits an HTML form to eSewa form endpoint.**
2. **Customer logs into eSewa.**
3. **OTP/token step is shown by eSewa (UAT test token: 123456).**
4. **eSewa redirects to:**

- **successurl on successful flow**  
- **failureurl on failed/canceled/pending flow**

1. **On success redirect, merchant receives Base64-encoded payload in query/body (implementation dependent), decodes it, and verifies the response signature.**
2. **Merchant performs Status Check API call (especially if callback is delayed or for anti-fraud verification).**
3. **Merchant marks order paid only when verification is trustworthy (COMPLETE and values match expected order).**

---

## **3 Environment URLs**

### **Payment Form Submission**

- **UAT/Test: [https://rc-epay.esewa.com.np/api/epay/main/v2/form](https://rc-epay.esewa.com.np/api/epay/main/v2/form)**  
- **Production: [https://epay.esewa.com.np/api/epay/main/v2/form](https://epay.esewa.com.np/api/epay/main/v2/form)**

**Important:** The form endpoint accepts **POST only** with all fields below. Opening the URL in a browser (GET) returns JSON such as `{"error_message":"Service is currently unavailable. Please try again later.","code":0}` — that is expected, not a misconfiguration.

### **Transaction Status Check**

- **UAT/Test: [https://rc.esewa.com.np/api/epay/transaction/status/?productcode=EPAYTESTtotalamount=100transactionuuid=123](https://rc.esewa.com.np/api/epay/transaction/status/?product_code=EPAYTEST&total_amount=100&transaction_uuid=123)**  
- **Production: [https://esewa.com.np/api/epay/transaction/status/?productcode=EPAYTESTtotalamount=100transactionuuid=123](https://esewa.com.np/api/epay/transaction/status/?product_code=EPAYTEST&total_amount=100&transaction_uuid=123)**

---

## **4 Required Request Fields (Form POST)**

**ePay v2 (official Epay-V2) uses snake_case HTML field names. All are required and must not be empty:**

- **amount**  
- **tax_amount**  
- **product_service_charge**  
- **product_delivery_charge**  
- **total_amount**  
- **transaction_uuid**  
- **product_code**  
- **success_url**  
- **failure_url**  
- **signed_field_names**  
- **signature**

### **Amount Relationship (must hold exactly)**

**total_amount = amount + tax_amount + product_service_charge + product_delivery_charge**

**If you do not use tax/service/delivery, send those values as 0.**

### **transaction_uuid Rules**

- **Must be unique per transaction attempt.**  
- **Supports alphanumeric and hyphen (-) only.**  
- **Never reuse for different payments.**

---

## **5 Signature Generation (Critical Security Part)**

**eSewa requires HMAC-SHA256 and Base64 encoding.**

### **Input string for signature**

**Signed fields (v2) in this order:**

**total_amount,transaction_uuid,product_code**

**Construct message string exactly in key=value CSV style (underscores must match the form field names):**

**total_amount=110,transaction_uuid=241028,product_code=EPAYTEST**

### **Secret key**

- **Provided by eSewa for each merchant.**  
- **UAT test secret (eSewa Epay-V2; note the `&`): `8gBm/:&EnhH.1/q`** — a copy missing `&` will produce a valid-looking local HMAC but **rc-epay rejects it with ES104**.

### **Algorithm**

**signature  Base64( HMACSHA256(message, secretkey) )**

### **Important correctness rules**

- **Keep field order exactly equal to signed_field_names.**  
- **Use exact values sent in request (no trimming/rounding side effects).**  
- **Treat all input as string when building message.**  
- **Do signature generation on server side only.**

---

## **6 Example HTML Form (UAT)**

**form action="[https://rc-epay.esewa.com.np/api/epay/main/v2/form](https://rc-epay.esewa.com.np/api/epay/main/v2/form)" method="POST"**  
  **input name="amount" value="100" /**  
  **input name="tax_amount" value="10" /**  
  **input name="total_amount" value="110" /**  
  **input name="transaction_uuid" value="241028" /**  
  **input name="product_code" value="EPAYTEST" /**  
  **input name="product_service_charge" value="0" /**  
  **input name="product_delivery_charge" value="0" /**  
  **input name="success_url" value="[https://developer.esewa.com.np/success](https://developer.esewa.com.np/success)" /**  
  **input name="failure_url" value="[https://developer.esewa.com.np/failure](https://developer.esewa.com.np/failure)" /**  
  **input name="signed_field_names" value="total_amount,transaction_uuid,product_code" /**  
  **input name="signature" value="(compute HMAC-SHA256 Base64 for the message above with UAT secret)" /**  
  **input type="submit" value="Submit" /**  
**/form**

**Example signature** for `total_amount=110`, `transaction_uuid=241028`, `product_code=EPAYTEST`, secret `8gBm/:&EnhH.1/q`: **i94zsd3oXF6ZsSr/kGqT4sSzYQzjj1W/waxjWyRwaME=**

---

## **7 Signature Code Samples**

### **JavaScript (Node.js)**

**import crypto from "crypto";**

**function generateEsewaSignature({ total_amount, transaction_uuid, product_code, secret }) {**  
  **const message = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;**  
  **return crypto.createHmac("sha256", secret).update(message).digest("base64");**  
**}**

### **Python**

**import hmac**  
**import hashlib**  
**import base64**

**def generate_esewa_signature(total_amount, transaction_uuid, product_code, secret):**  
    **message = f"total_amount={total_amount},transaction_uuid={transaction_uuid},product_code={product_code}"**  
    **digest = hmac.new(secret.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).digest()**  
    **return base64.b64encode(digest).decode("utf-8")**

---

## **8 Handling Success Redirect Correctly**

**After successful payment, eSewa sends a Base64-encoded response payload. Decoded object example:**

**{**  
  **"transactioncode": "000AWEO",**  
  **"status": "COMPLETE",**  
  **"totalamount": 1000.0,**  
  **"transactionuuid": "250610-162413",**  
  **"productcode": "EPAYTEST",**  
  **"signedfieldnames": "transactioncode,status,totalamount,transactionuuid,productcode,signedfieldnames",**  
  **"signature": "62GcfZTmVkzhtUeh+QJ1AqiJrjoWWGof3U+eTPTZ7fA="**  
**}**

### **Mandatory validation checklist on success callback**

1. **Decode Base64 safely.**
2. **Parse JSON and ensure required keys exist.**
3. **Recompute signature from fields listed in response signedfieldnames.**
4. **Constant-time compare received signature and computed signature.**
5. **Confirm:**

- **status = COMPLETE**  
- **transactionuuid matches your pending order**  
- **productcode matches your merchant code**  
- **totalamount equals expected payable amount**

1. **Then call Status Check API for final reconciliation where required by your risk policy.**
2. **Mark order paid only after all checks pass.**

---

## **9 Status Check API (Verification / Recovery)**

**Use status check when:**

- **No callback/redirect data received in expected time (docs mention 5 minutes).**  
- **Customer reports paid but merchant not updated.**  
- **You want anti-fraud reconfirmation before fulfillment.**

### **Request**

**GET /api/epay/transaction/status/?product_code=...&total_amount=...&transaction_uuid=...**

### **Sample success response**

**{**  
  **"productcode": "EPAYTEST",**  
  **"transactionuuid": "123",**  
  **"totalamount": 100.0,**  
  **"status": "COMPLETE",**  
  **"refid": "0001TS9"**  
**}**

### **Status meanings**

- **PENDING: initiated but not completed**  
- **COMPLETE: successful payment**  
- **FULLREFUND: fully refunded**  
- **PARTIALREFUND: partially refunded**  
- **AMBIGUOUS: uncertain/intermediate state, retry and monitor**  
- **NOTFOUND: terminated/session expired/no valid transaction found**  
- **CANCELED: canceled/reversed**  
- **Service is currently unavailable: timeout/system issue**

### **Suggested retry strategy**

- **Poll every 10-20 seconds for a short window (for example, up to 5 minutes).**  
- **Stop early on final statuses (COMPLETE, CANCELED, NOTFOUND, refunds).**  
- **For AMBIGUOUS/unavailable, retry with capped backoff and log incident.**

---

## **10 Recommended Backend Architecture**

1. **Create Payment API (POST /payments/esewa/initiate)**

- **Validates cart/order**  
- **Creates pending payment record**  
- **Generates transactionuuid  signature**  
- **Returns form fields (or rendered auto-submit page)**

1. **Success Callback API/Page (GET/POST /payments/esewa/success)**

- **Decodes payload**  
- **Verifies signature and values**  
- **Updates payment record**

1. **Failure Callback API/Page (GET/POST /payments/esewa/failure)**

- **Marks failed/pending as appropriate**

1. **Status Verify API/Worker**

- **Queries status endpoint**  
- **Reconciles uncertain records**

**Never trust client-side-only confirmation.**

---

## **11 Production Hardening Checklist**

- **Store secret key in environment variable, never in frontend.**  
- **Use strict idempotency for payment updates (same transactionuuid processed once).**  
- **Log raw callback payload and verification results for audits.**  
- **Compare amount with fixed decimal handling.**  
- **Whitelist and validate successurl/failureurl in your system design.**  
- **Keep order state machine explicit: PENDING  COMPLETE/FAILED/REFUNDED.**  
- **Use HTTPS-only endpoints.**

---

## **12 Common Mistakes to Avoid**

- **Wrong signedfieldnames order.**  
- **Signature generated from different values than submitted.**  
- **totalamount mismatch with its components.**  
- **Reusing same transactionuuid.**  
- **Marking order complete without signature verification.**  
- **Skipping status check on delayed/uncertain outcomes.**

---

## **13 UAT Credentials and Notes (From eSewa Docs)**

- **Test eSewa IDs: 9806800001/2/3/4/5**  
- **Password: Nepal@123**  
- **MPIN: 1122 (application context)**  
- **Test token: 123456**

**These are for testing only. Use merchant-provided production credentials and secrets in live mode.**

---

## **14 Quick Integration Runbook**

1. **Get merchant productcode  secret from eSewa.**
2. **Implement server-side signature generation.**
3. **Build checkout form submit to UAT URL.**
4. **Implement success/failure endpoints.**
5. **Decode  verify callback signature.**
6. **Implement status API verification and retries.**
7. **Run end-to-end UAT cases:**

- **success**  
- **cancel**  
- **delayed/no callback**  
- **amount mismatch/fraud handling**

1. **Switch URLs and credentials to production after UAT sign-off.**

---

## **15 Minimal Validation Pseudocode**

**if callbackreceived:**  
  **payload  base64decode(callbackdata)**  
  **assert verifysignature(payload)**  
  **assert payload.transactionuuid exists in pendingorders**  
  **assert payload.totalamount = expectedtotal**  
  **if payload.status = COMPLETE:**  
    **status  checkstatusapi(productcode, totalamount, transactionuuid)**  
    **if status = COMPLETE:**  
      **markorderpaid()**  
    **else:**  
      **keepunderreview()**  
**else:**  
  **status  checkstatusapi(productcode, totalamount, transactionuuid)**  
  **updateorderby(status)**

---

## **16 Final Notes**

- **The screenshot and copied content align with the same official sections: flow, signature, integration form, callback payload, and status checks.**  
- **Signature verification and server-side reconciliation are the most important controls against false-positive payment confirmation.**


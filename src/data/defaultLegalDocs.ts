import { LegalDocument } from '../types';

export const DEFAULT_TERMS_AND_CONDITIONS: LegalDocument = {
  id: 'terms_and_conditions',
  title: 'Terms & Conditions of Service',
  tagline: 'Culinary Service Agreement, Ordering Policies & Patron Rights',
  lastUpdated: 'September 2026',
  version: 'v2.4.0',
  summary:
    'These Terms & Conditions govern your access to and use of TAASH BHATTI culinary services, online ordering platform, takeaway counters, and food delivery fulfillment. By accessing our services, creating an account, or placing an order, you agree to be bound by these culinary terms.',
  contactEmail: 'support@taashbhatti.com',
  contactPhone: '+91 91234 56789',
  contactAddress: 'TAASH BHATTI Central Cloud Kitchens & Royal Hearth, Muzaffarpur, Bihar 842001, India',
  sections: [
    {
      id: 'agreement',
      title: '1. Brand Identity & Acceptance of Terms',
      content:
        'Welcome to TAASH BHATTI ("Brand", "we", "us", or "our"). TAASH BHATTI is a gourmet artisanal food brand specializing in slow-cooked charcoal bhatti delicacies, royal clay handi preparations, tandoori culinary specialties, and direct doorstep dining. These Terms & Conditions constitute a legally binding agreement between you ("Patron", "Customer", or "You") and TAASH BHATTI. By accessing our web application, browsing menus, utilizing interactive cards, or placing food orders, you acknowledge that you have read, understood, and agreed to adhere to these terms in their entirety.',
      subpoints: [
        'Applicable to all digital orders placed through our web app, mobile platforms, and takeaway counter kiosks.',
        'You must be at least 18 years of age or possess legal parental or guardian consent to place binding orders and transact online.',
        'Periodic updates to these terms may be published to reflect operational, legal, or culinary policy enhancements.',
      ],
    },
    {
      id: 'ordering_contract',
      title: '2. Culinary Ordering, Customizations & Order Confirmation',
      content:
        'Placing an order on TAASH BHATTI represents an offer to purchase freshly cooked, made-to-order culinary items. An order is deemed formally confirmed only once it is reviewed and acknowledged by the designated TAASH BHATTI kitchen branch. While we strive to maintain complete real-time menu availability, all preparations are subject to the daily arrival of fresh produce, artisanal marinations, and live hearth capacity.',
      subpoints: [
        'Each dish is prepared live upon kitchen acceptance to guarantee peak culinary aroma and temperature.',
        'Special chef preparation notes (such as spice tolerance adjustments or exclusion of specific garnishes) are accommodated on a best-effort basis but do not constitute a warranty where cross-contact is inevitable.',
        'In the rare event that a dish or key culinary ingredient runs out of stock after order transmission, our kitchen team will promptly notify you to offer a royal alternative or initiate an immediate wallet refund.',
      ],
    },
    {
      id: 'kitchen_hygiene_fssai',
      title: '3. Food Preparation, Hygiene Standards & FSSAI Compliance',
      content:
        'TAASH BHATTI adheres to stringent culinary hygiene protocols and food safety regulations mandated by the Food Safety and Standards Authority of India (FSSAI). All our commercial kitchen units, cloud branches, and live hearth stations implement strict daily sanitation, food-grade temperature controls, and mandatory PPE for all culinary staff.',
      subpoints: [
        'All raw meats, poultry, paneer, and fresh market produce undergo mandatory multi-stage ozone and thermal quality washes prior to marination.',
        'Separate cutting stations, dedicated utensils, and color-coded prep counters are maintained between vegetarian and non-vegetarian culinary preparations.',
        'Dishes are packed in food-grade, leak-proof, and tamper-evident thermal packaging designed to retain warmth and prevent transit contamination.',
      ],
    },
    {
      id: 'allergens_spices',
      title: '4. Allergen Declarations & Dietary Transparency',
      content:
        'We believe in complete ingredient transparency. Our digital menu displays detailed culinary specifications including base gravies, cooking mediums (pure desi ghee, mustard oil, cold-pressed oils), and prominent allergen badges (Dairy, Gluten, Tree Nuts, Peanuts, Mustard, Soy, Eggs, etc.).',
      subpoints: [
        'Patrons with severe, life-threatening food allergies are strongly advised to exercise caution and consult our kitchen dispatch manager prior to placing orders.',
        'Because all dishes are handcrafted in an open-fire artisanal kitchen environment, trace cross-contact of common kitchen ingredients (such as nuts, dairy, or gluten) cannot be completely eliminated.',
        'TAASH BHATTI disclaims liability for adverse reactions resulting from undisclosed patron sensitivities or general spice tolerance variations.',
      ],
    },
    {
      id: 'delivery_takeaway',
      title: '5. Doorstep Delivery Logistics & Counter Takeaways',
      content:
        'TAASH BHATTI operates a dedicated delivery logistics network alongside partner dispatchers to ensure hot, prompt doorstep delivery. For delivery orders, customers are responsible for providing precise GPS pin coordinates, building landmarks, and responsive contact telephone numbers.',
      subpoints: [
        'Delivery times displayed on the order screen (e.g. 25–35 minutes) are dynamic operational estimates factoring in chef prep duration, weather conditions, and road traffic.',
        'Tamper-evident security seals are affixed to every order package. If a package arrives with a broken, cut, or tampered seal, the customer should refuse acceptance and immediately report the incident via the in-app support portal.',
        'For takeaway orders, patrons must present their unique 4-Digit Pickup OTP at the kitchen branch counter to receive their fresh package.',
        'If a delivery partner arrives at the designated address and is unable to reach the customer after multiple attempts within 10 minutes, the order may be marked delivered or returned without refund due to food spoilage.',
      ],
    },
    {
      id: 'cancellations_refunds',
      title: '6. Perishable Food Cancellation, Return & Refund Policy',
      content:
        'Because our culinary preparations are freshly cooked and highly perishable, standard retail return rules do not apply to food orders. Once a kitchen branch accepts your order and chef preparation commences, the order cannot be cancelled or altered.',
      subpoints: [
        'Cancellations requested within the pre-cooking grace period (typically 60 seconds after submission or before kitchen acceptance) qualify for 100% instant refund to your Bhatti Wallet.',
        'In verified instances of incorrect dish delivery, missing items, damaged packaging, or unacceptable food quality, customers must submit photographic proof via Customer Support within 2 hours of delivery.',
        'Upon culinary supervisor verification, eligible refunds are credited immediately to the patron’s Bhatti Wallet (zero processing delay) or reversed to the source payment method within 3–5 banking days.',
        'Orders cannot be returned or refunded due to subjective personal taste preferences if the meal was prepared according to the standard menu recipe.',
      ],
    },
    {
      id: 'pricing_payments',
      title: '7. Menu Pricing, Taxes, Discounts & Payment Gateways',
      content:
        'All prices published on our menu are denominated in Indian National Rupees (INR) and are subject to applicable Goods and Services Tax (GST) as mandated by Indian tax authorities. Any packaging charges or distance-based delivery fees are transparently itemized prior to final checkout confirmation.',
      subpoints: [
        'Payments may be completed via approved digital methods: UPI (Google Pay, PhonePe, Paytm, BHIM), Credit/Debit Cards, Net Banking, Bhatti Wallet balance, or Cash on Delivery (COD where eligible).',
        'We utilize PCI-DSS certified third-party payment gateways. TAASH BHATTI never accesses or stores sensitive payment details such as card CVVs or net banking passwords.',
        'Coupons, promotional Ember coins, and brand discounts are subject to specific minimum order values, expiration dates, and usage limits, and cannot be redeemed for physical currency.',
      ],
    },
    {
      id: 'intellectual_property',
      title: '8. Culinary Recipes, Brand Assets & Intellectual Property',
      content:
        'All registered and unregistered trademarks, culinary trade names, logo emblems, secret spice blends, signature cooking methods, dish photography, interactive card deck visual assets, and proprietary application source code are the exclusive intellectual property of TAASH BHATTI.',
      subpoints: [
        'Customers are granted a personal, non-commercial, revocable license to access the ordering app for personal dining purposes.',
        'Reproduction, scraping, automated data harvesting, or commercial imitation of TAASH BHATTI brand assets or proprietary recipes is strictly prohibited.',
      ],
    },
    {
      id: 'conduct_liability',
      title: '9. Patron Conduct, Account Security & Limitation of Liability',
      content:
        'Customers agree to interact respectfully with our kitchen personnel, customer support agents, and delivery riders. Abusive language, fraudulent claims, non-payment of cash on delivery, or exploitation of vouchers will result in immediate permanent account termination.',
      subpoints: [
        'You are responsible for maintaining the confidentiality of your account credentials, verified telephone numbers, and order confirmation OTPs.',
        'To the maximum extent permitted by applicable Indian law, TAASH BHATTI’s aggregate liability for any dispute arising from an order is strictly limited to the actual amount paid for that specific order.',
        'We shall not be liable for delivery failures or delays resulting from Force Majeure events, including severe weather, civic unrest, flash floods, or road closures.',
      ],
    },
    {
      id: 'governing_law',
      title: '10. Dispute Resolution & Governing Jurisdiction',
      content:
        'These Terms & Conditions shall be governed by and construed in accordance with the substantive laws of India. Any legal dispute, controversy, or claim arising out of or relating to your culinary orders or use of our services shall be subject to the exclusive jurisdiction of the competent courts in Muzaffarpur, Bihar, India.',
      subpoints: [
        'Before initiating formal legal proceedings, patrons agree to submit complaints to our Customer Grievance Cell for amicable resolution within 14 business days.',
        'Grievances can be lodged via email to support@taashbhatti.com or via written mail to our registered operational kitchen address.',
      ],
    },
  ],
};

export const DEFAULT_PRIVACY_POLICY: LegalDocument = {
  id: 'privacy_policy',
  title: 'Privacy & Data Governance Policy',
  tagline: 'How TAASH BHATTI Collects, Protects, Uses & Safeguards Your Data',
  lastUpdated: 'September 2026',
  version: 'v2.4.0',
  summary:
    'At TAASH BHATTI, we respect your privacy and are committed to complete transparency regarding how your personal information is gathered, managed, and safeguarded. This Privacy Policy details our data governance practices across all digital ordering and culinary delivery services.',
  contactEmail: 'privacy@taashbhatti.com',
  contactPhone: '+91 91234 56789',
  contactAddress: 'TAASH BHATTI Data Governance & Grievance Cell, Muzaffarpur, Bihar 842001, India',
  sections: [
    {
      id: 'commitment',
      title: '1. Commitment to Customer Privacy & Zero Data Selling',
      content:
        'TAASH BHATTI is first and foremost an authentic food brand. Our business model relies on serving royal culinary preparations, not monetizing your personal information. We strictly pledge that WE NEVER SELL, RENT, LEASE, OR TRADE YOUR PERSONAL INFORMATION TO THIRD-PARTY ADVERTISERS, MARKETING AGENCIES, OR DATA BROKERS UNDER ANY CIRCUMSTANCES.',
      subpoints: [
        'Data collection is strictly limited to information necessary to prepare, pack, dispatch, deliver, and support your food orders.',
        'All personnel with access to customer data are bound by strict non-disclosure obligations and enterprise access controls.',
        'We uphold the core principles of data minimization, purpose limitation, and storage limitation.',
      ],
    },
    {
      id: 'data_collected',
      title: '2. Personal Data We Collect & How We Acquire It',
      content:
        'To deliver hot meals and maintain your culinary dining preferences, we collect specific categories of personal data when you interact with our platform:',
      subpoints: [
        'Contact & Identity Data: Your full name, telephone number (verified via secure OTP), and email address used for order confirmations and critical delivery status alerts.',
        'Delivery & Geographical Coordinates: Saved doorstep addresses, flat/house numbers, nearby landmarks, and GPS latitude/longitude coordinates captured when you set a delivery pin on the interactive map.',
        'Order & Culinary History: Records of meals ordered, spice preferences, special chef instructions, deck collections, order timestamps, and total transactional values.',
        'Customer Service Communications: In-app support tickets, chat logs with support staff, call request notes, and uploaded photographs of orders submitted for quality resolution.',
        'Technical & Device Telemetry: IP address, device type, operating system, browser specifications, and session identifiers collected automatically to maintain session state and prevent fraudulent ordering scripts.',
      ],
    },
    {
      id: 'financial_data_security',
      title: '3. Payment & Financial Data Handling',
      content:
        'We adhere to the highest international security protocols for electronic transactions. When you pay for your royal feast online via UPI, Credit Card, Debit Card, or Net Banking, your financial credentials are encrypted and processed directly by RBI-licensed, PCI-DSS compliant payment gateways (such as Razorpay or secure banking aggregators).',
      subpoints: [
        'TAASH BHATTI NEVER collects, accesses, logs, or stores raw credit/debit card numbers, CVVs, expiration dates, UPI PINs, or net banking passwords on our servers.',
        'Our database only retains transaction identifiers (e.g., Payment ID, Order ID, settlement status, and payment method mode) required for bookkeeping, tax invoicing, and processing instant refunds.',
        'Bhatti Wallet balances and Ember coins are recorded in our secure cloud database linked directly to your authenticated user identifier.',
      ],
    },
    {
      id: 'how_we_use_data',
      title: '4. Purposes & Legal Grounds for Processing Your Data',
      content:
        'Every piece of data collected by TAASH BHATTI is utilized with a precise, legitimate culinary operational purpose:',
      subpoints: [
        'Order Preparation & Fulfillment: Relaying your selected dishes, portion sizes, and allergen notes to the kitchen display systems (KDS) of our active chef brigade.',
        'Rider Routing & Doorstep Dispatch: Calculating kitchen proximity, dispatching the nearest delivery captain, and guiding them directly to your delivery pin.',
        'Real-Time Order Notifications: Sending timely SMS, WhatsApp, and push updates regarding cooking progress, rider assignment, arrival notifications, and OTP verification.',
        'Customer Support & Issue Resolution: Verifying past orders when you report an issue, processing wallet reimbursements, and improving kitchen quality.',
        'Fraud Detection & Platform Integrity: Monitoring for duplicate malicious orders, fake addresses, or abuse of discount codes to safeguard legitimate customers.',
        'Statutory Tax & Regulatory Compliance: Maintaining food safety records and generating GST-compliant tax invoices as required under Indian commercial statutes.',
      ],
    },
    {
      id: 'data_sharing_partners',
      title: '5. Limited Third-Party Disclosures & Operational Partners',
      content:
        'We share your information only with trusted service partners strictly on a need-to-know basis to execute your dining experience:',
      subpoints: [
        'Assigned Delivery Partners: Only the customer name, delivery address landmark, and masked contact number are shared with the on-duty delivery captain for the active order. Once delivered, contact history is archived.',
        'Payment Aggregators: Transaction values and order IDs shared securely for payment capture and refund processing.',
        'Cloud Infrastructure & Hosting: Our databases and computing infrastructure are hosted on Google Cloud Platform and Firebase enterprise environments located in secure regional cloud data centers.',
        'Legal Authorities: We may disclose personal information if required to do so by a formal court order, law enforcement investigation, or regulatory mandate.',
      ],
    },
    {
      id: 'data_security_measures',
      title: '6. Data Protection, Encryption & Storage Security',
      content:
        'We implement enterprise-grade technical and organizational measures to protect your personal information from unauthorized access, loss, alteration, or disclosure:',
      subpoints: [
        'All data transmitted between your browser and our servers is secured using 256-bit TLS/HTTPS cryptographic encryption.',
        'Cloud databases utilize AES-256 encryption at rest, fortified with granular Attribute-Based Access Controls (ABAC) and strict security rules.',
        'Access to patron records is strictly partitioned by role: kitchen line cooks only view dish items, while customer contact data is restricted to authorized dispatch and support officers.',
        'Continuous automated monitoring is maintained to identify and thwart brute-force attacks, credential stuffing, and session hijacking.',
      ],
    },
    {
      id: 'data_retention_rights',
      title: '7. Data Retention & Your Individual Privacy Rights',
      content:
        'You maintain full sovereignty over your personal data. TAASH BHATTI provides clear, straightforward mechanisms for patrons to exercise their digital rights:',
      subpoints: [
        'Right to Access & Inspect: You can review your profile information, saved delivery addresses, and comprehensive order history directly in the Account tab at any time.',
        'Right to Rectification: You can update or modify your name, contact phone, or saved addresses directly through the app interface.',
        'Right to Erasure ("Right to Be Forgotten"): You may request permanent deletion of your account and associated personal data by contacting privacy@taashbhatti.com or raising a data deletion ticket in the support portal.',
        'Data Retention Schedule: Non-transactional profile data is deleted upon account closure. Transactional order and invoice records are archived for 7 years strictly to satisfy statutory tax, auditing, and commercial recordkeeping obligations.',
      ],
    },
    {
      id: 'cookies_storage',
      title: '8. Cookies, Local Storage & Tracking Technologies',
      content:
        'Our web application utilizes essential client-side storage technologies (such as browser LocalStorage and temporary session cookies) to ensure a seamless dining experience:',
      subpoints: [
        'Used to remember your authenticated session so you do not need to re-login upon refreshing.',
        'Used to preserve your live cart dishes and custom deck configurations while you navigate between menu tabs.',
        'Used to remember your delivery address preference and audio/notification toggles.',
        'WE DO NOT USE THIRD-PARTY TRACKING COOKIES to monitor your web activity across external non-Taash Bhatti websites.',
      ],
    },
    {
      id: 'children_privacy',
      title: '9. Children’s Privacy Protection',
      content:
        'TAASH BHATTI does not knowingly solicit or collect personal information from children under the age of 13. If we discover that personal data of a minor has been gathered without verifiable parental consent, we will promptly purge such information from our records.',
      subpoints: [
        'Parents or legal guardians who become aware that their child has provided contact details may email us at privacy@taashbhatti.com for immediate account removal.',
      ],
    },
    {
      id: 'dpo_contact',
      title: '10. Data Protection Officer & Grievance Redressal',
      content:
        'In accordance with the Information Technology Act and applicable Indian digital personal data protection frameworks, we have designated a dedicated Data Protection Officer (DPO) to handle inquiries, grievances, and regulatory consultations:',
      subpoints: [
        'Data Protection Officer: TAASH BHATTI Legal & Privacy Governance Cell',
        'Official Email: privacy@taashbhatti.com',
        'Direct Assistance Phone: +91 91234 56789 (10:00 AM – 8:00 PM IST, Monday through Saturday)',
        'Physical Headquarters: TAASH BHATTI Central Cloud Kitchens, Muzaffarpur, Bihar 842001, India',
        'All formal privacy complaints will be acknowledged within 48 hours and investigated thoroughly within 14 business days.',
      ],
    },
  ],
};

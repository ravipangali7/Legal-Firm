"""Default rows for PracticeArea — used by data migration and optional management commands."""


def _svc(sid: str, title: str, description: str, focus: str) -> dict:
    return {
        "id": sid,
        "title": title,
        "description": description,
        "details": [
            f"End-to-end advisory for {focus} from assessment through execution.",
            "Drafting, review, and compliance support tailored to the transaction profile.",
            "Risk analysis with practical recommendations aligned with Nepalese legal requirements.",
        ],
        "previews": [
            {"label": "Scope", "value": focus},
            {"label": "Support", "value": "Advisory + Documentation"},
            {"label": "Delivery", "value": "Step-by-step legal guidance"},
        ],
    }


def default_practice_area_rows() -> list[dict]:
    """Shape matches PracticeArea model fields (slug, name, icon, overview, tags, related_cases_title, services, sort_order)."""
    return [
        {
            "slug": "company-law",
            "name": "Company Law",
            "icon": "Building2",
            "overview": (
                "Comprehensive company law services covering incorporation, governance, "
                "and statutory compliance for businesses in Nepal."
            ),
            "tags": ["Company Registration", "Compliance", "Governance", "Licensing"],
            "related_cases_title": "Related Company Law Cases",
            "services": [
                _svc(
                    "company-registration",
                    "Company Registration",
                    "Name reservation, incorporation filings, and setup compliance.",
                    "Company setup and registration",
                ),
                _svc(
                    "compliance",
                    "Corporate Compliance",
                    "Periodic filings, statutory registers, and annual compliance management.",
                    "Regulatory and annual compliance",
                ),
                _svc(
                    "governance",
                    "Corporate Governance",
                    "Board process structuring, resolutions, and governance framework review.",
                    "Board and shareholder governance",
                ),
                _svc(
                    "dissolution",
                    "Company Dissolution",
                    "Winding-up support with closure filings and legal risk mitigation.",
                    "Company closure and winding up",
                ),
            ],
            "sort_order": 0,
        },
        {
            "slug": "corporate-law",
            "name": "Corporate Law",
            "icon": "Scale",
            "overview": (
                "Strategic corporate legal counsel for transactions, structuring, investments, "
                "and long-term business risk management."
            ),
            "tags": ["M&A", "Joint Ventures", "Restructuring", "Corporate Contracts"],
            "related_cases_title": "Related Corporate Law Cases",
            "services": [
                _svc("ma", "Mergers and Acquisitions", "Transaction support from due diligence to closing.", "M&A transactions"),
                _svc(
                    "jv",
                    "Joint Venture Structuring",
                    "JV term structuring and partnership documentation.",
                    "Joint venture and partnerships",
                ),
                _svc(
                    "capital",
                    "Capital Structuring",
                    "Advisory on investment rounds and shareholder rights.",
                    "Capital and investment structuring",
                ),
                _svc(
                    "corp-contracts",
                    "Corporate Contracting",
                    "Drafting and negotiation of key corporate agreements.",
                    "Corporate contract lifecycle",
                ),
            ],
            "sort_order": 1,
        },
        {
            "slug": "taxation-law",
            "name": "Taxation Law",
            "icon": "Receipt",
            "overview": (
                "Tax legal services for compliance, advisory, planning, and dispute management "
                "across direct and indirect tax obligations."
            ),
            "tags": ["Tax Compliance", "Advisory", "Tax Planning", "Tax Disputes"],
            "related_cases_title": "Related Taxation Law Cases",
            "services": [
                _svc(
                    "tax-filing",
                    "Tax Compliance and Filing",
                    "Return preparation, filing validation, and compliance review.",
                    "Tax filing and compliance",
                ),
                _svc(
                    "tax-plan",
                    "Tax Planning and Advisory",
                    "Practical planning to optimize tax positions lawfully.",
                    "Tax planning strategy",
                ),
                _svc(
                    "tax-dispute",
                    "Tax Dispute Resolution",
                    "Representation in assessments, objections, and appeals.",
                    "Tax dispute handling",
                ),
                _svc(
                    "intl-tax",
                    "International Tax Matters",
                    "Cross-border structuring, treaties, and transfer-pricing advisory.",
                    "Cross-border taxation",
                ),
            ],
            "sort_order": 2,
        },
        {
            "slug": "banking-law",
            "name": "Banking Law",
            "icon": "Landmark",
            "overview": (
                "Specialized banking law support for lending documentation, compliance, "
                "debt recovery, and regulatory response."
            ),
            "tags": ["Lending", "Compliance", "Debt Recovery", "Banking Regulation"],
            "related_cases_title": "Related Banking Law Cases",
            "services": [
                _svc(
                    "lending",
                    "Lending Documentation",
                    "Facility documentation and security structuring support.",
                    "Loan and security documentation",
                ),
                _svc(
                    "reg-bank",
                    "Banking Compliance",
                    "Regulatory readiness and compliance control advisory.",
                    "Banking regulatory compliance",
                ),
                _svc("recovery", "Debt Recovery", "Recovery process planning and enforcement strategy.", "Debt recovery actions"),
                _svc(
                    "audit-response",
                    "Regulatory Response",
                    "Legal support for regulator notices and inspections.",
                    "Regulatory correspondence",
                ),
            ],
            "sort_order": 3,
        },
        {
            "slug": "insurance-law",
            "name": "Insurance Law",
            "icon": "Shield",
            "overview": (
                "Insurance legal assistance for policy structuring, claims support, disputes, "
                "and compliance with insurer obligations."
            ),
            "tags": ["Policy Review", "Claims", "Disputes", "Insurance Compliance"],
            "related_cases_title": "Related Insurance Law Cases",
            "services": [
                _svc(
                    "policy",
                    "Policy Structuring",
                    "Review and drafting support for policy language and exclusions.",
                    "Insurance policy design",
                ),
                _svc("claims", "Claims Advisory", "Claim preparation and evidence alignment for better outcomes.", "Claims handling"),
                _svc(
                    "ins-dispute",
                    "Claims Dispute Resolution",
                    "Representation in claim denial or settlement disputes.",
                    "Insurance dispute resolution",
                ),
                _svc(
                    "ins-reg",
                    "Regulatory Compliance",
                    "Compliance support for insurer and intermediary obligations.",
                    "Insurance compliance systems",
                ),
            ],
            "sort_order": 4,
        },
        {
            "slug": "intellectual-property-law",
            "name": "Intellectual Property Law",
            "icon": "Copyright",
            "overview": (
                "IP law services covering registration, enforcement, licensing, and strategic "
                "protection of valuable business assets."
            ),
            "tags": ["Trademark", "Copyright", "Patent", "Licensing"],
            "related_cases_title": "Related Intellectual Property Law Cases",
            "services": [
                _svc("tm", "Trademark Protection", "Search, filing, and prosecution support for marks.", "Trademark lifecycle"),
                _svc(
                    "copyright",
                    "Copyright Advisory",
                    "Protection strategy for literary, software, and media works.",
                    "Copyright compliance",
                ),
                _svc(
                    "licensing",
                    "IP Licensing",
                    "Drafting and negotiation of IP licensing terms.",
                    "IP commercialization",
                ),
                _svc(
                    "enforcement",
                    "IP Enforcement",
                    "Notice, negotiation, and litigation prep for infringement.",
                    "IP infringement response",
                ),
            ],
            "sort_order": 5,
        },
        {
            "slug": "cooperative-law",
            "name": "Co-operative Law",
            "icon": "Users",
            "overview": (
                "Legal services for co-operative societies in registration, member governance, "
                "compliance, and dispute management."
            ),
            "tags": ["Registration", "Governance", "Members", "Compliance"],
            "related_cases_title": "Related Co-operative Law Cases",
            "services": [
                _svc(
                    "coop-reg",
                    "Society Registration",
                    "Formation, registration, and constitutional document support.",
                    "Co-operative registration",
                ),
                _svc(
                    "member",
                    "Member Governance",
                    "By-law and member rights advisory for smooth operation.",
                    "Member governance structures",
                ),
                _svc(
                    "coop-compliance",
                    "Co-operative Compliance",
                    "Regulatory filings and internal governance checks.",
                    "Regulatory compliance",
                ),
                _svc(
                    "coop-dispute",
                    "Internal Dispute Support",
                    "Resolution framework for management and member disputes.",
                    "Internal dispute management",
                ),
            ],
            "sort_order": 6,
        },
        {
            "slug": "civil-law",
            "name": "Civil Law",
            "icon": "Gavel",
            "overview": (
                "Civil law representation for contractual, property, and liability disputes "
                "with clear strategy and documentation."
            ),
            "tags": ["Contracts", "Property", "Damages", "Civil Procedure"],
            "related_cases_title": "Related Civil Law Cases",
            "services": [
                _svc(
                    "civil-contract",
                    "Contractual Disputes",
                    "Claim assessment and representation in contract breaches.",
                    "Contract dispute resolution",
                ),
                _svc(
                    "property",
                    "Property Matters",
                    "Ownership, possession, and title-related civil actions.",
                    "Property civil claims",
                ),
                _svc(
                    "damages",
                    "Damages and Compensation",
                    "Quantification and claim strategy for civil losses.",
                    "Compensation claims",
                ),
                _svc(
                    "injunction",
                    "Injunction and Relief",
                    "Urgent and interim relief applications in civil courts.",
                    "Interim civil relief",
                ),
            ],
            "sort_order": 7,
        },
        {
            "slug": "criminal-law",
            "name": "Criminal Law",
            "icon": "AlertTriangle",
            "overview": (
                "Criminal law assistance from complaint stage through trial, including defense "
                "strategy and procedural safeguards."
            ),
            "tags": ["Defense", "Bail", "Investigation", "Trial Support"],
            "related_cases_title": "Related Criminal Law Cases",
            "services": [
                _svc(
                    "defense",
                    "Criminal Defense",
                    "Fact review, legal defense strategy, and court representation.",
                    "Criminal defense strategy",
                ),
                _svc(
                    "bail",
                    "Bail and Custody Matters",
                    "Bail petition preparation and custody hearing support.",
                    "Bail and custody proceedings",
                ),
                _svc(
                    "investigation",
                    "Investigation-stage Advisory",
                    "Rights protection during statements and investigation actions.",
                    "Investigation representation",
                ),
                _svc(
                    "appeal",
                    "Criminal Appeals",
                    "Appeal drafting and challenge strategy after conviction.",
                    "Post-trial criminal appeals",
                ),
            ],
            "sort_order": 8,
        },
        {
            "slug": "family-law",
            "name": "Family Law",
            "icon": "Heart",
            "overview": (
                "Family law services addressing marriage, divorce, custody, support, and property "
                "matters with practical sensitivity."
            ),
            "tags": ["Divorce", "Custody", "Maintenance", "Family Property"],
            "related_cases_title": "Related Family Law Cases",
            "services": [
                _svc(
                    "divorce",
                    "Divorce and Separation",
                    "Petition support and settlement structuring for separation.",
                    "Marital separation",
                ),
                _svc(
                    "custody",
                    "Custody and Guardianship",
                    "Child-focused custody planning and representation.",
                    "Custody and guardianship",
                ),
                _svc(
                    "maintenance",
                    "Maintenance and Support",
                    "Maintenance claims and defense strategy.",
                    "Family maintenance claims",
                ),
                _svc(
                    "family-property",
                    "Family Property Issues",
                    "Property allocation and ownership claims in family disputes.",
                    "Family property resolution",
                ),
            ],
            "sort_order": 9,
        },
        {
            "slug": "consumer-law",
            "name": "Consumer Law",
            "icon": "ShoppingCart",
            "overview": (
                "Consumer law support for unfair trade, service deficiency, product liability, "
                "and complaint adjudication."
            ),
            "tags": ["Consumer Complaints", "Defective Products", "Service Deficiency", "Compensation"],
            "related_cases_title": "Related Consumer Law Cases",
            "services": [
                _svc(
                    "complaints",
                    "Consumer Complaints",
                    "Case preparation and complaint filing support.",
                    "Consumer complaint process",
                ),
                _svc(
                    "product",
                    "Defective Product Claims",
                    "Assessment and claim structuring for product defects.",
                    "Product liability claims",
                ),
                _svc(
                    "service",
                    "Service Deficiency Matters",
                    "Legal handling for deficient or unfair service practices.",
                    "Service deficiency disputes",
                ),
                _svc(
                    "consumer-comp",
                    "Compensation Actions",
                    "Quantification and recovery strategy for losses.",
                    "Consumer compensation",
                ),
            ],
            "sort_order": 10,
        },
    ]

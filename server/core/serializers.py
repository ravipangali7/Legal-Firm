from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import AppSettings, ContactMessage, UserProfile

User = get_user_model()

SUBSCRIBE_PLAN_MAP = {
    "basic": User.Plan.BASIC,
    "professional": User.Plan.PREMIUM,
    "enterprise": User.Plan.ENTERPRISE,
}


class SignupSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=64)
    password = serializers.CharField(write_only=True, min_length=8)
    user_type = serializers.ChoiceField(choices=UserProfile.UserType.choices)
    pan = serializers.CharField(max_length=64, required=False, allow_blank=True)
    vat = serializers.CharField(max_length=64, required=False, allow_blank=True)
    company_name = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate_email(self, value):
        return value.strip().lower()

    def validate(self, attrs):
        if attrs["user_type"] == UserProfile.UserType.BUSINESS:
            if len((attrs.get("pan") or "").strip()) < 9:
                raise serializers.ValidationError({"pan": "PAN is required for business (min 9 characters)."})
            if len((attrs.get("vat") or "").strip()) < 9:
                raise serializers.ValidationError({"vat": "VAT is required for business (min 9 characters)."})
            if len((attrs.get("company_name") or "").strip()) < 2:
                raise serializers.ValidationError({"company_name": "Company name is required for business."})
        return attrs

    def create(self, validated_data):
        pw = validated_data.pop("password")
        user_type = validated_data.pop("user_type")
        pan = validated_data.pop("pan", "") or ""
        vat = validated_data.pop("vat", "") or ""
        company_name = validated_data.pop("company_name", "") or ""

        user = User.objects.create_user(
            email=validated_data["email"],
            password=pw,
            full_name=validated_data["full_name"],
            phone=validated_data["phone"],
            status=User.Status.PENDING,
            plan=User.Plan.FREE,
            subscribed=False,
        )
        UserProfile.objects.create(
            user=user,
            user_type=user_type,
            pan=pan,
            vat=vat,
            company_name=company_name,
        )
        return user


class EsewaInitiateSerializer(serializers.Serializer):
    """Authenticated POST /api/payments/esewa/initiate/ — start hosted eSewa checkout."""

    billing_cycle = serializers.ChoiceField(
        choices=["monthly", "six_month", "yearly"],
        default="monthly",
        required=False,
    )


class SubscribePendingSerializer(serializers.Serializer):
    """Create a pending Transaction for an existing user (legacy manual proof flow — eSewa only)."""

    email = serializers.EmailField()
    plan = serializers.ChoiceField(choices=list(SUBSCRIBE_PLAN_MAP.keys()), required=False)
    billing_cycle = serializers.ChoiceField(
        choices=["monthly", "six_month", "yearly"],
        default="monthly",
        required=False,
    )
    payment_method = serializers.ChoiceField(
        choices=["esewa"],
    )
    txn_code = serializers.CharField(max_length=128, min_length=5)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("1"))

    def validate_email(self, value):
        return value.strip().lower()

    def validate_plan(self, value):
        return SUBSCRIBE_PLAN_MAP[value]


class PublicContactSerializer(serializers.Serializer):
    """Public POST /api/public/contact/ — mirrors web ContactPage validation."""

    name = serializers.CharField(max_length=100)
    email = serializers.EmailField(max_length=255)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default="")
    subject = serializers.CharField(max_length=150)
    message = serializers.CharField(max_length=1000)

    def validate_name(self, value: str):
        v = value.strip()
        if len(v) < 2:
            raise serializers.ValidationError("Name is required.")
        return v

    def validate_subject(self, value: str):
        v = value.strip()
        if len(v) < 2:
            raise serializers.ValidationError("Subject is required.")
        return v

    def validate_message(self, value: str):
        v = value.strip()
        if len(v) < 10:
            raise serializers.ValidationError("Message must be at least 10 characters.")
        return v

    def validate_email(self, value: str):
        return value.strip().lower()

    def create(self, validated_data):
        phone = (validated_data.get("phone") or "").strip()
        return ContactMessage.objects.create(
            name=validated_data["name"],
            email=validated_data["email"],
            phone=phone,
            subject=validated_data["subject"],
            message=validated_data["message"],
        )


class ContactMessageDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ["id", "name", "email", "phone", "subject", "message", "created_at"]

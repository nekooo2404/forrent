from getpass import getpass

from django.contrib.auth import get_user_model, password_validation
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.common.audit import audit_event
from apps.common.models import AuditLog
from apps.common.validators import normalize_vietnamese_phone, validate_vietnamese_phone


User = get_user_model()


class Command(BaseCommand):
    help = "Create or promote a SALER admin account without exposing credentials."

    def add_arguments(self, parser):
        parser.add_argument("--email", help="Unique email address for the admin account.")
        parser.add_argument("--phone", help="Vietnamese phone number for the admin account.")
        parser.add_argument("--full-name", dest="full_name", help="Display name for the admin account.")

    def handle(self, *args, **options):
        email = (options["email"] or input("Admin email: ")).strip().lower()
        phone = normalize_vietnamese_phone(options["phone"] or input("Admin phone: "))
        full_name = (options["full_name"] or input("Admin full name: ")).strip()

        if not email:
            raise CommandError("Email is required.")
        if not full_name:
            raise CommandError("Full name is required.")
        try:
            validate_vietnamese_phone(phone)
        except ValidationError as exc:
            raise CommandError(str(exc)) from exc

        password = getpass("Admin password (input hidden): ")
        password_confirmation = getpass("Confirm admin password (input hidden): ")
        if not password:
            raise CommandError("Password is required.")
        if password != password_confirmation:
            raise CommandError("Passwords do not match.")

        user_by_phone = User.objects.filter(phone=phone).first()
        user_by_email = User.objects.filter(email=email).first()
        if user_by_phone and user_by_email and user_by_phone.pk != user_by_email.pk:
            raise CommandError("The email and phone belong to different users.")

        user = user_by_phone or user_by_email
        created = user is None
        if user is not None:
            if user_by_phone and user.email.lower() != email:
                raise CommandError("This phone is already linked to another email.")
            if user_by_email and user.phone != phone:
                raise CommandError("This email is already linked to another phone.")

        previous_role = user.role if user is not None else None
        if user is None:
            user = User(
                email=email,
                phone=phone,
                full_name=full_name,
                role=User.Role.SALER,
                is_active=True,
                is_staff=True,
                is_superuser=False,
            )
        else:
            user.full_name = full_name
            user.role = User.Role.SALER
            user.is_active = True
            user.is_staff = True
            user.is_superuser = False

        try:
            password_validation.validate_password(password, user=user)
        except ValidationError as exc:
            raise CommandError(" ".join(exc.messages)) from exc

        user.set_password(password)
        with transaction.atomic():
            user.save()
            audit_event(
                "admin.user_provisioned",
                target=user,
                status=AuditLog.Status.SUCCESS,
                metadata={
                    "created": created,
                    "role": User.Role.SALER,
                    "provisioned_via": "management_command",
                    "previous_role": previous_role,
                },
            )

        action = "Created" if created else "Promoted/reset"
        self.stdout.write(self.style.SUCCESS(f"{action} SALER admin: {user.email} / {user.phone}"))

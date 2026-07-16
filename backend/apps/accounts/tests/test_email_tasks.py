from django.core import mail

from apps.accounts.tasks import send_otp_email


def test_otp_email_includes_branded_html_template():
    send_otp_email("tenant@example.com", "123456", "REGISTER", 1)

    message = mail.outbox[0]
    html = next(content for content, mimetype in message.alternatives if mimetype == "text/html")

    assert "Xác thực tài khoản" in html
    assert "123456" in html
    assert "10 phút" in html
    assert "Đội ngũ ForRent" in html

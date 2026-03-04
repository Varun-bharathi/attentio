import smtplib
from email.message import EmailMessage
import os

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "noreply@attentio.com")
SMTP_PASS = os.getenv("SMTP_PASS", "")

def send_report_email(faculty_email: str, meeting_id: int, pdf_path: str):
    """
    Sends the generated PDF report via email.
    """
    msg = EmailMessage()
    msg['Subject'] = f"Attention Report for Meeting {meeting_id}"
    msg['From'] = SMTP_USER
    msg['To'] = faculty_email
    msg.set_content(f"Hello, attached is the combined attention report for meeting {meeting_id}.")
    
    with open(pdf_path, 'rb') as f:
        file_data = f.read()
        file_name = os.path.basename(f.name)
    
    msg.add_attachment(file_data, maintype='application', subtype='octet-stream', filename=file_name)
    
    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
            print("Email sent successfully!")
    except Exception as e:
        print(f"Failed to send email: {e}")

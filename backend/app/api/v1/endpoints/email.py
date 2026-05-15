import os
import resend
from fastapi import APIRouter, Depends, HTTPException, status
from app.api import deps
from app.models import User
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

def get_welcome_html(first_name: str) -> str:
    # Elite Editorial Aesthetic HTML Template
    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                margin: 0;
                padding: 0;
                background-color: #FAF9F6; /* Alabaster */
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                color: #1C1C19; /* Rich Black */
                line-height: 1.6;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                padding: 60px 20px;
            }}
            .logo {{
                font-family: 'Playfair Display', 'Times New Roman', Times, serif;
                font-size: 24px;
                font-weight: 600;
                letter-spacing: -0.02em;
                margin-bottom: 60px;
            }}
            h1 {{
                font-family: 'Playfair Display', 'Times New Roman', Times, serif;
                font-size: 42px;
                font-weight: 400;
                line-height: 1.1;
                letter-spacing: -0.02em;
                margin-bottom: 24px;
                color: #1C1C19;
            }}
            p {{
                font-size: 16px;
                color: #828076; /* Grounded Warm Gray */
                margin-bottom: 24px;
            }}
            .signature {{
                margin-top: 60px;
                border-top: 1px solid rgba(28, 28, 25, 0.1);
                padding-top: 24px;
                font-size: 14px;
            }}
            .btn {{
                display: inline-block;
                background-color: #1C1C19;
                color: #FAF9F6;
                text-decoration: none;
                padding: 16px 32px;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                margin-top: 32px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">Findance.</div>
            
            <h1>Identity Verified.</h1>
            
            <p>Welcome, {first_name}. Your profile has been successfully established within our infrastructure.</p>
            <p>You now have full access to construct your financial architecture, monitor inflows, and strategize your holdings with absolute clarity.</p>
            
            <a href="http://localhost:3000" class="btn">Enter Dashboard</a>
            
            <div class="signature">
                <p><strong>The Findance Strategy Team</strong><br>
                Secure. Private. Elite.</p>
            </div>
        </div>
    </body>
    </html>
    """

@router.post("/welcome")
def send_welcome_email(current_user: User = Depends(deps.get_current_user)):
    """
    Sends the Elite Editorial Welcome Email to the verified user.
    """
    first_name = current_user.first_name or "Client"
    html_content = get_welcome_html(first_name)
    
    if not settings.RESEND_API_KEY:
        logger.warning(f"RESEND_API_KEY is not set. Simulating Welcome Email to {current_user.email}")
        return {"status": "simulated", "message": "Email logged to console (No API Key)"}

    resend.api_key = settings.RESEND_API_KEY

    try:
        r = resend.Emails.send({
            "from": "Findance <onboarding@resend.dev>",
            "to": current_user.email,
            "subject": "Identity Verified - Welcome to Findance",
            "html": html_content
        })
        return {"status": "success", "message": "Welcome email dispatched", "resend_id": r.get("id")}
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to dispatch email: {str(e)}")

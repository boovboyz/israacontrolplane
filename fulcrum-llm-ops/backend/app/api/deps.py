from fastapi import Header, HTTPException, status
from app.settings import settings
from typing import Optional

async def verify_api_key(
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None)
):
    """
    Verifies API Key from Authorization header (Bearer <key>) or X-API-Key header.
    """
    if settings.AUTH_DISABLED:
        return True

    api_key_header = x_api_key
    
    # Try Authorization: Bearer <key>
    if authorization:
        if authorization.startswith("Bearer "):
            api_key_header = authorization.split(" ")[1]
        else:
             api_key_header = authorization

    if not api_key_header:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API Key",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if api_key_header != settings.FULCRUM_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return True

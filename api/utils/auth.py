"""
Authentication utilities for validating JWT tokens and checking roles.
"""
from fastapi import Header, HTTPException, Depends
from jose import jwt, JWTError
from typing import List
import os

# These should match what's in your auth router
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"


def get_current_user(authorization: str = Header(None)) -> dict:
    """
    Extract and validate JWT token from Authorization header.
    Returns the decoded user payload.
    
    Usage in routes:
        current_user: dict = Depends(get_current_user)
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header is required"
        )
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header format. Expected 'Bearer <token>'"
        )
    
    token = authorization.split(" ")[1]
    
    try:
        # Decode and validate JWT
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication token: {str(e)}"
        )


def require_role(allowed_roles: List[str]):
    """
    Dependency factory that creates a role checker.
    User must have at least ONE of the specified roles.
    
    Usage in routes:
        current_user: dict = Depends(require_role(["provider", "admin"]))
    
    Args:
        allowed_roles: List of role names. User needs at least one.
    
    Returns:
        Function that validates user has required role
    """
    async def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        # Get user's roles from JWT payload
        user_roles = current_user.get("roles", [])
        
        # Check if user has at least one of the required roles
        has_required_role = any(role in user_roles for role in allowed_roles)
        
        if not has_required_role:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}. Your roles: {', '.join(user_roles) if user_roles else 'none'}"
            )
        
        # Log access (optional)
        username = current_user.get("sub", "unknown")
        print(f"✅ User '{username}' with roles {user_roles} accessed protected endpoint")
        
        return current_user
    
    return role_checker


def require_provider(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Shortcut dependency that requires 'provider' or 'admin' role.
    
    Usage in routes:
        current_user: dict = Depends(require_provider)
    
    This is equivalent to:
        current_user: dict = Depends(require_role(["provider", "admin"]))
    """
    user_roles = current_user.get("roles", [])
    
    if "provider" not in user_roles and "admin" not in user_roles:
        raise HTTPException(
            status_code=403,
            detail="Access denied. This endpoint requires provider or admin privileges."
        )
    
    return current_user


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Dependency that requires 'admin' role specifically.
    
    Usage in routes:
        current_user: dict = Depends(require_admin)
    """
    user_roles = current_user.get("roles", [])
    
    if "admin" not in user_roles:
        raise HTTPException(
            status_code=403,
            detail="Access denied. This endpoint requires admin privileges."
        )
    
    return current_user
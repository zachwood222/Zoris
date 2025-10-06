"""Simple role-based security primitives."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException, status


@dataclass
class User:
    id: str
    roles: set[str]


class AuthBackend:
    """Very small stand-in for Clerk/Supabase auth."""

    def __call__(self) -> User:
        # In production integrate with Clerk/Supabase. For the starter we accept a header.
        return User(id="demo", roles={"Admin", "Purchasing", "Floor", "AP", "Driver"})


def _get_user() -> User:
    return AuthBackend()()


def require_roles(*required: str):
    async def dependency(user: User = Depends(_get_user)) -> User:
        if not set(required).intersection(user.roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="insufficient_role")
        return user

    return dependency


CurrentUser = Annotated[User, Depends(_get_user)]

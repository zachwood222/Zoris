"""Implementation backing the lightweight ``pytest_asyncio`` shim."""

from __future__ import annotations

import asyncio
import inspect
from collections.abc import AsyncGenerator, Awaitable, Callable
from typing import Any, TypeVar, overload

import pytest

F = TypeVar("F", bound=Callable[..., Any])


def _run(coro: Awaitable[Any]) -> Any:
    """Execute *coro* to completion using :func:`asyncio.run`."""

    return asyncio.run(coro)


def _wrap_async_fixture(func: F, decorator: Callable[[F], F]) -> F:
    if inspect.isasyncgenfunction(func):

        @decorator  # type: ignore[misc]
        def wrapper(*args: Any, **kwargs: Any) -> AsyncGenerator[Any, None]:
            agen = func(*args, **kwargs)
            try:
                value = _run(agen.__anext__())
            except StopAsyncIteration as exc:  # pragma: no cover - defensive
                raise RuntimeError("Async fixture did not yield") from exc
            try:
                yield value
            finally:
                _run(agen.aclose())

        return wrapper  # type: ignore[return-value]

    if inspect.iscoroutinefunction(func):

        @decorator  # type: ignore[misc]
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            return _run(func(*args, **kwargs))

        return wrapper  # type: ignore[return-value]

    return decorator(func)


@overload
def fixture(__func: F) -> F:  # pragma: no cover - overload helper
    ...


@overload
def fixture(*, scope: str | None = ..., params: Any = ..., autouse: bool = ..., ids: Any = ..., name: str | None = ...) -> Callable[[F], F]:  # pragma: no cover - overload helper
    ...


def fixture(*args: Any, **kwargs: Any):
    """Drop-in replacement for :func:`pytest_asyncio.fixture`.

    The shim mirrors the public API of the upstream helper while executing
    asynchronous fixtures in an event loop created via :func:`asyncio.run`.
    """

    if args and callable(args[0]) and not kwargs:
        decorator = pytest.fixture
        return _wrap_async_fixture(args[0], decorator)

    def decorator(func: F) -> F:
        fixture_decorator = pytest.fixture(*args, **kwargs)
        return _wrap_async_fixture(func, fixture_decorator)

    return decorator


def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line(
        "markers",
        "asyncio: mark test coroutine to be executed in an event loop",
    )


@pytest.hookimpl(tryfirst=True)
def pytest_pyfunc_call(pyfuncitem: pytest.Function) -> bool:
    if inspect.iscoroutinefunction(pyfuncitem.obj):
        argnames = pyfuncitem._fixtureinfo.argnames  # type: ignore[attr-defined]
        kwargs = {name: pyfuncitem.funcargs[name] for name in argnames}
        _run(pyfuncitem.obj(**kwargs))
        return True

    return False

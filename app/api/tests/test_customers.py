import pytest

from ..db import SessionLocal, engine
from ..models.base import Base
from ..models.domain import Customer
from ..routes.customers import search_customers


@pytest.mark.asyncio
async def test_search_customers_returns_sorted_results() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        session.add_all(
            [
                Customer(name="Taylor Reed", email="taylor@example.com", phone="555-0120"),
                Customer(name="Jordan Alvarez", email="jordan@example.com", phone="555-0100"),
                Customer(name="Sasha Patel", email="sasha@example.com", phone="555-0110"),
            ]
        )
        await session.commit()

    async with SessionLocal() as session:
        customers = await search_customers(session=session)

    assert [customer.name for customer in customers] == [
        "Jordan Alvarez",
        "Sasha Patel",
        "Taylor Reed",
    ]


@pytest.mark.asyncio
async def test_search_customers_filters_by_query() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        session.add_all(
            [
                Customer(name="Jordan Alvarez", email="jordan@example.com", phone="555-0100"),
                Customer(name="Morgan Lee", email="morgan@example.com", phone="555-0130"),
                Customer(name="Taylor Reed", email="taylor@example.com", phone="555-0120"),
            ]
        )
        await session.commit()

    async with SessionLocal() as session:
        customers = await search_customers(q="Morgan", session=session)

    assert len(customers) == 1
    assert customers[0].name == "Morgan Lee"


@pytest.mark.asyncio
async def test_search_customers_respects_limit() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        session.add_all(
            [
                Customer(name="Customer A"),
                Customer(name="Customer B"),
                Customer(name="Customer C"),
            ]
        )
        await session.commit()

    async with SessionLocal() as session:
        customers = await search_customers(limit=2, session=session)

    assert len(customers) == 2

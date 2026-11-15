"""rename streetlight category and electrical department

Revision ID: 72b37fe9cd71
Revises: 15fb03abc8e5
Create Date: 2026-11-15 04:24:59.548459

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


# revision identifiers, used by Alembic.
revision: str = '72b37fe9cd71'
down_revision: Union[str, Sequence[str], None] = '15fb03abc8e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        "UPDATE complaint SET category = 'Streetlight' WHERE category = 'Streetlight & Power Outage';"
    )
    op.execute(
        "UPDATE triage_queue SET predicted_category = 'Streetlight' WHERE predicted_category = 'Streetlight & Power Outage';"
    )
    op.execute(
        "UPDATE triage_queue SET final_category = 'Streetlight' WHERE final_category = 'Streetlight & Power Outage';"
    )
    op.execute(
        "UPDATE department SET name = 'Electrical Department' WHERE name = 'MSEB';"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        "UPDATE department SET name = 'MSEB' WHERE name = 'Electrical Department';"
    )
    op.execute(
        "UPDATE triage_queue SET final_category = 'Streetlight & Power Outage' WHERE final_category = 'Streetlight';"
    )
    op.execute(
        "UPDATE triage_queue SET predicted_category = 'Streetlight & Power Outage' WHERE predicted_category = 'Streetlight';"
    )
    op.execute(
        "UPDATE complaint SET category = 'Streetlight & Power Outage' WHERE category = 'Streetlight';"
    )

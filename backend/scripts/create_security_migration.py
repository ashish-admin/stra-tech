#!/usr/bin/env python3
"""
Create database migration for security enhancements.

This script generates the necessary database migration to add security fields
to the User table for account lockout, login tracking, and user status management.
"""

import os
import sys
from datetime import datetime

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def create_migration_file():
    """Create Alembic migration file for security enhancements."""
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{timestamp}_add_user_security_fields.py"
    migration_dir = os.path.join(os.path.dirname(__file__), '..', 'migrations', 'versions')
    
    if not os.path.exists(migration_dir):
        os.makedirs(migration_dir)
    
    migration_content = f'''"""Add user security fields for account lockout and login tracking

Revision ID: {timestamp}
Revises: head
Create Date: {datetime.now().isoformat()}

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '{timestamp}'
down_revision = 'head'
branch_labels = None
depends_on = None


def upgrade():
    """Add security fields to user table."""
    # Add new security columns
    op.add_column('user', sa.Column('created_at', sa.DateTime(), nullable=True))
    op.add_column('user', sa.Column('last_login', sa.DateTime(), nullable=True))
    op.add_column('user', sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'))
    op.add_column('user', sa.Column('failed_login_attempts', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('user', sa.Column('last_failed_login', sa.DateTime(), nullable=True))
    
    # Add indexes for performance
    op.create_index(op.f('ix_user_username'), 'user', ['username'], unique=False)
    op.create_index(op.f('ix_user_email'), 'user', ['email'], unique=False)
    op.create_index(op.f('ix_user_last_failed_login'), 'user', ['last_failed_login'], unique=False)
    
    # Set default created_at for existing users
    op.execute("UPDATE \"user\" SET created_at = NOW() WHERE created_at IS NULL")
    
    # Make created_at non-nullable after setting defaults
    op.alter_column('user', 'created_at', nullable=False)


def downgrade():
    """Remove security fields from user table."""
    # Remove indexes
    op.drop_index(op.f('ix_user_last_failed_login'), table_name='user')
    op.drop_index(op.f('ix_user_email'), table_name='user')
    op.drop_index(op.f('ix_user_username'), table_name='user')
    
    # Remove columns
    op.drop_column('user', 'last_failed_login')
    op.drop_column('user', 'failed_login_attempts')
    op.drop_column('user', 'is_active')
    op.drop_column('user', 'last_login')
    op.drop_column('user', 'created_at')
'''
    
    filepath = os.path.join(migration_dir, filename)
    
    with open(filepath, 'w') as f:
        f.write(migration_content)
    
    print(f"Created migration file: {filepath}")
    print("To apply the migration, run:")
    print("cd backend && flask db upgrade")
    
    return filepath

if __name__ == '__main__':
    create_migration_file()
#!/usr/bin/env python3
"""
Secure secret key generator for LokDarpan.

This script generates cryptographically secure secret keys suitable for production use.
"""

import secrets
import string
import sys

def generate_secret_key(length=64):
    """Generate a cryptographically secure secret key."""
    # Use letters, digits, and safe special characters
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+[]{}|;:,.<>?"
    
    # Generate random key
    secret_key = ''.join(secrets.choice(alphabet) for _ in range(length))
    
    return secret_key

def validate_secret_key(key):
    """Validate a secret key's strength."""
    if len(key) < 32:
        return False, "Secret key too short (minimum 32 characters)"
    
    # Check for variety of character types
    has_upper = any(c.isupper() for c in key)
    has_lower = any(c.islower() for c in key)
    has_digit = any(c.isdigit() for c in key)
    has_special = any(c in "!@#$%^&*()-_=+[]{}|;:,.<>?" for c in key)
    
    if not all([has_upper, has_lower, has_digit]):
        return False, "Secret key should contain uppercase, lowercase, and digits"
    
    # Check for weak patterns
    weak_patterns = ['secret', 'key', 'password', 'admin', 'test', 'dev', 'default']
    if any(pattern in key.lower() for pattern in weak_patterns):
        return False, "Secret key contains weak patterns"
    
    return True, "Secret key is strong"

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--validate":
            if len(sys.argv) < 3:
                print("Usage: python generate_secret_key.py --validate <key>")
                sys.exit(1)
            
            key = sys.argv[2]
            valid, message = validate_secret_key(key)
            print(f"Validation: {message}")
            sys.exit(0 if valid else 1)
    
    # Generate new key
    key = generate_secret_key()
    print(f"Generated secret key: {key}")
    print(f"Length: {len(key)} characters")
    
    # Validate the generated key
    valid, message = validate_secret_key(key)
    print(f"Validation: {message}")
    
    print("\nTo use this key, set it in your environment:")
    print(f"export SECRET_KEY='{key}'")
    print("or add it to your .env file:")
    print(f"SECRET_KEY={key}")
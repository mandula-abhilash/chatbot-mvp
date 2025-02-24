"""Script to run tests."""
import pytest
import sys

def main():
    # Add arguments for pytest
    args = [
        "-v",  # Verbose output
        "tests",  # Test directory
        "-s",  # Show print statements
    ]
    
    # Add integration flag if specified
    if "--integration" in sys.argv:
        args.append("--integration")
    
    # Run tests
    exit_code = pytest.main(args)
    sys.exit(exit_code)

if __name__ == "__main__":
    main()
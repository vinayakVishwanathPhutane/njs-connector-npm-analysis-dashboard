#!/bin/bash

# Setup script for configuring daily cron job
# This script helps you set up a cron job to run update-details.sh daily

# Get the absolute path of the project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_PATH="$PROJECT_DIR/update-details.sh"

echo "=========================================="
echo "Cron Job Setup for NPM Analytics Dashboard"
echo "=========================================="
echo ""
echo "This will set up a daily cron job to:"
echo "  1. Update package details"
echo "  2. Restart the server"
echo ""
echo "Script location: $SCRIPT_PATH"
echo ""

# Check if the update script exists
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "ERROR: update-details.sh not found!"
    exit 1
fi

# Make sure the script is executable
chmod +x "$SCRIPT_PATH"

# Cron job entry (runs daily at 2 AM)
CRON_ENTRY="0 2 * * * $SCRIPT_PATH"

echo "Suggested cron job (runs daily at 2:00 AM):"
echo "$CRON_ENTRY"
echo ""

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$SCRIPT_PATH"; then
    echo "⚠️  A cron job for this script already exists!"
    echo ""
    echo "Current crontab entries for this script:"
    crontab -l | grep "$SCRIPT_PATH"
    echo ""
    read -p "Do you want to remove the existing entry and add a new one? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Remove existing entries
        crontab -l | grep -v "$SCRIPT_PATH" | crontab -
        echo "✓ Removed existing cron job"
    else
        echo "Setup cancelled."
        exit 0
    fi
fi

# Ask user for confirmation
echo ""
read -p "Do you want to add this cron job? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Add the cron job
    (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ Cron job added successfully!"
        echo ""
        echo "Current crontab:"
        crontab -l
        echo ""
        echo "The script will run daily at 2:00 AM."
        echo "Logs will be saved to: $PROJECT_DIR/update-details.log"
        echo ""
        echo "To view your cron jobs: crontab -l"
        echo "To edit your cron jobs: crontab -e"
        echo "To remove this cron job: crontab -e (then delete the line)"
    else
        echo "ERROR: Failed to add cron job"
        exit 1
    fi
else
    echo ""
    echo "Setup cancelled."
    echo ""
    echo "To manually add the cron job, run:"
    echo "  crontab -e"
    echo ""
    echo "Then add this line:"
    echo "  $CRON_ENTRY"
fi

echo ""
echo "=========================================="

# Made with Bob

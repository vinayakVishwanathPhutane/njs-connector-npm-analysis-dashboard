#!/bin/bash

# Daily Update Script for NPM Package Analytics Dashboard
# This script runs the analyzer to update package details

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the project directory
cd "$SCRIPT_DIR" || exit 1

# Log file for tracking updates
LOG_FILE="$SCRIPT_DIR/update-details.log"

# Function to log messages with timestamp
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_message "Starting daily update process..."

# Run the analyzer
log_message "Running npm package analyzer..."
npm run analyze >> "$LOG_FILE" 2>&1

# Check if the command was successful
if [ $? -eq 0 ]; then
    log_message "Update completed successfully!"
    
    log_message "Stopping existing server..."
    pm2 stop all

    pm2 restart my-app || pm2 start npm --name "my-app" -- run start
    
else
    log_message "ERROR: Update failed with exit code $?"
fi

log_message "Update process finished."
echo "----------------------------------------" >> "$LOG_FILE"

# Made with Bob

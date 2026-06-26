#!/bin/bash
# start_scheduler.sh
# -------------------
# Starts the SignalRadar automated pipeline scheduler.
# Run from the project root:  bash start_scheduler.sh

echo ""
echo "  ============================================================"
echo "   SignalRadar — Automated Lead Refresh Scheduler"
echo "  ============================================================"
echo ""
echo "  Listening on : http://localhost:8000"
echo "  API docs     : http://localhost:8000/docs"
echo "  Stop         : Ctrl+C"
echo ""

# Activate virtual environment if it exists
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

# Run scheduler from project root so Python resolves backend.* imports correctly
python -m backend.app_entry

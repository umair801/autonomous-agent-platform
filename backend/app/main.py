from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
import json
from datetime import datetime
import uuid
from app.schemas.models import GoalRequest, OrchestratorState
from app.agents.orchestrator import get_orchestrator
from app.tools.memory import cleanup_session

# Configure logging
log_level = os.getenv('LOG_LEVEL', 'info').upper()
logging.basicConfig(level=log_level)
logger = logging.getLogger(__name__)

# Initialize FastAPI app (no on_startup parameter - use lifespan instead in v0.104+)
app = FastAPI(
    title='Datawebify Autonomous Agent Platform',
    description='A Manus-style autonomous AI agent platform',
    version='1.0.0'
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Store active WebSocket connections
active_connections = {}

@app.get('/health')
async def health_check():
    env = os.getenv('ENVIRONMENT', 'development')
    return {'status': 'ok', 'environment': env}

@app.websocket('/ws/execute/{session_id}')
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time execution step visibility
    """
    await websocket.accept()
    active_connections[session_id] = websocket
    logger.info(f'WebSocket connected: {session_id}')
    
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f'Received from {session_id}: {data}')
    except WebSocketDisconnect:
        if session_id in active_connections:
            del active_connections[session_id]
        logger.info(f'WebSocket disconnected: {session_id}')
    except Exception as e:
        logger.error(f'WebSocket error for {session_id}: {str(e)}')
        if session_id in active_connections:
            del active_connections[session_id]

async def broadcast_step(session_id: str, step_data: dict):
    """
    Broadcast a step update to the connected frontend via WebSocket
    """
    if session_id in active_connections:
        try:
            message = {
                'type': 'step_update',
                'timestamp': datetime.now().isoformat(),
                'step': step_data
            }
            await active_connections[session_id].send_json(message)
            logger.info(f'Broadcasted step to {session_id}: {step_data.get("step_number")}')
        except Exception as e:
            logger.error(f'Failed to broadcast to {session_id}: {str(e)}')

@app.post('/api/execute')
async def execute_goal(request: GoalRequest):
    session_id = str(uuid.uuid4())
    logger.info(f'Starting execution for goal: {request.goal}, session: {session_id}')

    try:
        orchestrator = get_orchestrator()

        async def ws_broadcast(step_data: dict):
            await broadcast_step(session_id, step_data)

        initial_state: OrchestratorState = {
            'session_id': session_id,
            'goal': request.goal,
            'user_context': request.context or '',
            'execution_status': 'pending',
            'ws_callback': ws_broadcast,
        }

        result = await orchestrator.ainvoke(initial_state)

        logger.info(f'Execution completed for session {session_id}')

        return {
            'session_id': session_id,
            'status': result.get('execution_status'),
            'steps': result.get('steps', []),
            'final_output': result.get('final_output'),
            'total_tokens': result.get('total_tokens', 0),
        }

    except Exception as e:
        logger.error(f'Orchestrator error: {str(e)}')
        return {
            'session_id': session_id,
            'status': 'failed',
            'error': str(e),
        }

    finally:
        cleanup_session(session_id)
        

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)


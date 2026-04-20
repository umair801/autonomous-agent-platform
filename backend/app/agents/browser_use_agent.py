import logging
import asyncio
from typing import Optional
from browser_use import Agent

logger = logging.getLogger(__name__)

class BrowserUseAgent:
    """
    Specialist agent for autonomous web browser interaction
    Uses browser-use library for Playwright-based automation
    """
    
    def __init__(self):
        self.agent = None
        self.browser_state = {}
    
    async def initialize(self):
        """
        Initialize the browser agent
        Called once per session
        """
        try:
            logger.info('Initializing browser-use agent')
            self.agent = Agent(
                task="",  # Will be set per execution
                use_vision=True,  # Enable visual analysis
                max_actions=20  # Max actions per task
            )
            logger.info('Browser-use agent initialized')
        except Exception as e:
            logger.error(f'Failed to initialize browser-use agent: {str(e)}')
    
    async def execute_task(self, task: str, max_actions: int = 20) -> dict:
        """
        Execute a browser automation task
        
        Args:
            task: Natural language description of what to do
            max_actions: Maximum number of actions to take
        
        Returns:
        {
            'task': str,
            'status': 'completed' | 'failed',
            'result': str,
            'screenshot': bytes (optional),
            'extracted_data': dict,
            'actions_taken': int,
            'error': str (optional)
        }
        """
        if not self.agent:
            await self.initialize()
        
        try:
            logger.info(f'Browser task: {task}')
            
            # Set the task for the agent
            self.agent.task = task
            self.agent.max_actions = max_actions
            
            # Execute the task (this runs the agent)
            result = await self.agent.run()
            
            output = {
                'task': task,
                'status': 'completed',
                'result': str(result) if result else 'Task completed',
                'extracted_data': {},
                'actions_taken': getattr(self.agent, 'action_count', 0),
            }
            
            logger.info(f'Browser task completed: {output["actions_taken"]} actions')
            return output
        
        except Exception as e:
            logger.error(f'Browser task failed: {str(e)}')
            return {
                'task': task,
                'status': 'failed',
                'error': str(e),
                'extracted_data': {},
                'actions_taken': 0
            }
    
    async def close(self):
        """
        Close the browser session
        """
        try:
            if self.agent:
                await self.agent.close()
                logger.info('Browser-use agent closed')
        except Exception as e:
            logger.error(f'Error closing browser: {str(e)}')

# Global browser-use agent instance
browser_use_agent = BrowserUseAgent()

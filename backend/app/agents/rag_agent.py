import logging
import os
from typing import List, Optional
from openai import OpenAI

logger = logging.getLogger(__name__)

class RAGAgent:
    """
    Retrieval-Augmented Generation agent
    Retrieves relevant document chunks from Supabase pgvector in agent_knowledge_base table
    """
    
    def __init__(self):
        self.openai_key = os.getenv('OPENAI_API_KEY')
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_KEY')
        
        self.openai_client = OpenAI(api_key=self.openai_key) if self.openai_key else None
        self.embedding_model = 'text-embedding-3-small'
        
        # Lazy import Supabase to avoid connection errors
        self.supabase = None
    
    async def initialize_supabase(self):
        """Initialize Supabase client"""
        if not self.supabase and self.supabase_url and self.supabase_key:
            try:
                from supabase import create_client
                self.supabase = create_client(self.supabase_url, self.supabase_key)
                logger.info('Supabase client initialized for RAG')
            except Exception as e:
                logger.error(f'Failed to initialize Supabase: {str(e)}')
    
    async def embed_text(self, text: str) -> Optional[List[float]]:
        """Generate embeddings for text using OpenAI"""
        if not self.openai_client:
            logger.error('OpenAI client not configured')
            return None
        
        try:
            response = self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=text
            )
            embedding = response.data[0].embedding
            return embedding
        
        except Exception as e:
            logger.error(f'Embedding generation failed: {str(e)}')
            return None
    
    async def retrieve(self, query: str, session_id: Optional[str] = None, top_k: int = 5) -> dict:
        """
        Retrieve relevant document chunks from agent_knowledge_base
        
        Args:
            query: Natural language query
            session_id: Optional session ID to filter results
            top_k: Number of results to return
        
        Returns:
        {
            'query': str,
            'results': [
                {
                    'chunk': str,
                    'document_name': str,
                    'similarity': float,
                    'chunk_index': int
                },
                ...
            ],
            'total_results': int
        }
        """
        await self.initialize_supabase()
        
        if not self.supabase:
            logger.warning('Supabase not available, returning empty results')
            return {
                'query': query,
                'results': [],
                'error': 'Supabase not available'
            }
        
        try:
            logger.info(f'RAG retrieval for query: {query}')
            
            # Generate embedding for the query
            query_embedding = await self.embed_text(query)
            if not query_embedding:
                return {
                    'query': query,
                    'results': [],
                    'error': 'Failed to embed query'
                }
            
            # Query Supabase RPC function with vector similarity
            response = self.supabase.rpc(
                'match_agent_knowledge_base',
                {
                    'query_embedding': query_embedding,
                    'match_threshold': 0.5,
                    'match_count': top_k
                }
            ).execute()
            
            results = []
            if response.data:
                for item in response.data:
                    results.append({
                        'chunk': item.get('document_text', ''),
                        'document_name': item.get('document_name', ''),
                        'similarity': item.get('similarity', 0),
                        'chunk_index': item.get('chunk_index', 0)
                    })
            
            output = {
                'query': query,
                'results': results,
                'total_results': len(results)
            }
            
            logger.info(f'RAG retrieval returned {len(results)} results')
            return output
        
        except Exception as e:
            logger.error(f'RAG retrieval failed: {str(e)}')
            return {
                'query': query,
                'results': [],
                'error': str(e)
            }
    
    async def add_to_knowledge_base(self, document_name: str, text: str, session_id: Optional[str] = None) -> bool:
        """
        Add a document to agent_knowledge_base
        Chunks the text and stores embeddings
        """
        await self.initialize_supabase()
        
        if not self.supabase:
            logger.error('Supabase not available')
            return False
        
        try:
            logger.info(f'Adding document to agent_knowledge_base: {document_name}')
            
            # Simple chunking: split by paragraphs
            chunks = [chunk.strip() for chunk in text.split('\n\n') if chunk.strip()]
            
            for chunk_index, chunk in enumerate(chunks):
                # Generate embedding
                embedding = await self.embed_text(chunk)
                if not embedding:
                    logger.warning(f'Skipping chunk {chunk_index} due to embedding failure')
                    continue
                
                # Store in agent_knowledge_base table
                self.supabase.table('agent_knowledge_base').insert({
                    'document_name': document_name,
                    'document_text': chunk,
                    'embedding': embedding,
                    'chunk_index': chunk_index,
                    'session_id': session_id
                }).execute()
            
            logger.info(f'Document added: {len(chunks)} chunks stored')
            return True
        
        except Exception as e:
            logger.error(f'Failed to add document to agent_knowledge_base: {str(e)}')
            return False

# Global RAG agent instance
rag_agent = RAGAgent()

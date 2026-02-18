from rapidfuzz import process, fuzz
from typing import List, Dict, Tuple

def chunk_documents(docs: List[Tuple[str, str]], chunk_size: int = 500) -> List[Dict]:
    """
    Splits documents into smaller chunks for retrieval.
    Simple strategy: split by paragraphs, then group if too small.
    Returns list of dicts: {'source': filename, 'content': text_chunk}
    """
    chunks = []
    
    for filename, content in docs:
        # Split by double newline to get paragraphs
        paragraphs = content.split('\n\n')
        
        current_chunk = ""
        
        for p in paragraphs:
            # removing hashes for cleaner text match
            clean_p = p.strip()
            if not clean_p:
                continue
            
            if len(current_chunk) + len(clean_p) < chunk_size:
                current_chunk += "\n\n" + clean_p
            else:
                if current_chunk:
                    chunks.append({"source": filename, "content": current_chunk.strip()})
                current_chunk = clean_p
        
        # Add residual
        if current_chunk:
            chunks.append({"source": filename, "content": current_chunk.strip()})
            
    return chunks

def get_relevant_context(query: str, docs: List[Tuple[str, str]], top_k: int = 3) -> List[Dict]:
    """
    Retrieves top_k relevant chunks using fuzzy matching on the query.
    Returns list of dicts with score: {'source': ..., 'content': ..., 'score': ...}
    """
    chunks = chunk_documents(docs)
    chunk_texts = [c['content'] for c in chunks]
    
    # Use rapidfuzz to find best matches
    # process.extract returns list of (match_string, score, index)
    results = process.extract(query, chunk_texts, scorer=fuzz.partial_ratio, limit=top_k)
    
    top_chunks = []
    for match_text, score, idx in results:
        # Filter for somewhat relevant matches
        if score > 30: 
            item = chunks[idx].copy()
            item['score'] = round(score, 2)
            top_chunks.append(item)
            
    return top_chunks

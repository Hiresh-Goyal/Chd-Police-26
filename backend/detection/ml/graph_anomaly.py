import uuid
from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text

def analyze_graph(db: Session, case_id: uuid.UUID) -> Dict[str, Dict[str, Any]]:
    """
    Identify structurally anomalous nodes in the entity relationship graph.
    Returns: {entity_id: {centrality_scores, structural_anomaly_score, role_signal}}
    """
    try:
        import networkx as nx
    except ImportError:
        print("networkx not installed, skipping graph anomaly detection.")
        return {}
        
    query = text("""
        SELECT entity_a, entity_b, link_type
        FROM entity_links
        WHERE case_id = :case_id
    """)
    links = db.execute(query, {"case_id": case_id}).fetchall()
    
    if not links:
        return {}
        
    G = nx.Graph()
    for l in links:
        G.add_edge(str(l.entity_a), str(l.entity_b), type=l.link_type)
        
    if len(G.nodes) == 0:
        return {}
        
    bc = nx.betweenness_centrality(G)
    dc = nx.degree_centrality(G)
    
    results = {}
    for node in G.nodes:
        b_score = bc.get(node, 0)
        d_score = dc.get(node, 0)
        
        structural_anomaly = 0.0
        role_signal = 'UNKNOWN'
        
        if b_score > 0.7 and d_score > 0.5:
            structural_anomaly = 0.9
            role_signal = 'COORDINATOR'
        elif d_score > 0.8:
            structural_anomaly = 0.7
            role_signal = 'HUB'
            
        # For MULE, we normally need a DiGraph of just financial transactions
        # This is a simplified undirected networkx check
        
        results[node] = {
            "centrality_scores": {"betweenness": b_score, "degree": d_score},
            "structural_anomaly_score": structural_anomaly,
            "role_signal": role_signal
        }
        
    return results

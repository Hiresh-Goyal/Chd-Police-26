"""
LightGBM Transaction Anomaly Scorer with SHAP Explanations

Research basis:
- LightGBM: lowest P95/P99 latency (25-30% below XGBoost), highest AUC (0.95 avg),
  20% lower memory than XGBoost. (Research Square, Sep 2025)
- SHAP TreeExplainer: O(TLD) complexity for tree models — fast enough for per-transaction
  explanation at inference time without GPU.
- Approach: unsupervised via pseudo-labeling. We treat the top-5% anomalous transactions
  (by Isolation Forest pre-screen) as pseudo-fraud labels, then train LightGBM on the rest.
  This gives us SHAP-compatible feature attributions that Isolation Forest cannot provide.

IMPORTANT: This model NEVER creates findings alone. It only attaches ml_signal and
ml_explanation to existing deterministic findings. If no deterministic rule fires,
this model's output is ignored.
"""

import json
import numpy as np
import pandas as pd
from datetime import datetime

def _extract_features(events: list[dict]) -> pd.DataFrame:
    """
    Engineer features from BANK_TRANSFER canonical events.
    All features are computed from observable metadata — no content.
    """
    rows = []
    for e in events:
        ts = datetime.fromisoformat(str(e['ts_start']).replace('Z', '+00:00'))
        rows.append({
            'event_id': str(e['id']),
            'amount': float(e['amount'] or 0),
            'log_amount': float(np.log1p(float(e['amount'] or 0))),
            'hour_of_day': ts.hour,
            'day_of_week': ts.weekday(),
            'is_weekend': int(ts.weekday() >= 5),
            'is_night': int(ts.hour < 6 or ts.hour >= 22),
            'actor_raw': str(e.get('actor_raw', '')),
            'peer_raw': str(e.get('peer_raw', '')),
        })
    return pd.DataFrame(rows)


def _add_velocity_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add actor-level velocity features — how unusual is this actor's behavior?"""
    # Account-level statistics
    actor_stats = df.groupby('actor_raw')['amount'].agg(['mean', 'std', 'count']).reset_index()
    actor_stats.columns = ['actor_raw', 'actor_mean_amount', 'actor_std_amount', 'actor_txn_count']
    df = df.merge(actor_stats, on='actor_raw', how='left')
    
    # Z-score of amount vs actor's own history
    df['amount_zscore'] = (
        (df['amount'] - df['actor_mean_amount']) / (df['actor_std_amount'].replace(0, 1))
    ).fillna(0)
    
    # Peer frequency — how often does this peer appear?
    peer_freq = df['peer_raw'].value_counts().reset_index()
    peer_freq.columns = ['peer_raw', 'peer_frequency']
    df = df.merge(peer_freq, on='peer_raw', how='left')
    df['peer_frequency'] = df['peer_frequency'].fillna(1)
    
    return df


FEATURE_COLS = [
    'log_amount', 'hour_of_day', 'day_of_week', 'is_weekend', 'is_night',
    'amount_zscore', 'peer_frequency', 'actor_txn_count'
]

FEATURE_LABELS = {
    'log_amount': 'transaction amount',
    'hour_of_day': 'hour of day',
    'day_of_week': 'day of week',
    'is_weekend': 'weekend timing',
    'is_night': 'night-time activity',
    'amount_zscore': 'amount deviation from account average',
    'peer_frequency': 'peer account rarity',
    'actor_txn_count': 'account transaction volume',
}


def score_transactions(bank_events: list[dict]) -> dict[str, dict]:
    """
    Score bank transactions using LightGBM + SHAP.
    
    Returns: {event_id: {'ml_signal': float, 'ml_explanation': str}}
    
    Graceful fallback: if lightgbm or shap not installed, returns empty dict.
    The pipeline must work without this module.
    """
    if not bank_events or len(bank_events) < 10:
        # Need at least 10 transactions to compute meaningful statistics
        return {}
    
    try:
        import lightgbm as lgb
        import shap
        from sklearn.ensemble import IsolationForest
    except ImportError:
        return {}  # Graceful degradation
    
    # Step 1: Feature engineering
    df = _extract_features(bank_events)
    df = _add_velocity_features(df)
    
    X = df[FEATURE_COLS].fillna(0).values
    event_ids = df['event_id'].tolist()
    
    if X.shape[0] < 10:
        return {}
    
    # Step 2: Pseudo-label using Isolation Forest as a pre-screener
    # This is NOT the final score — just generates training labels for LightGBM
    iso = IsolationForest(contamination=0.05, random_state=42, n_estimators=50)
    pseudo_labels = iso.fit_predict(X)
    # IsolationForest: -1 = outlier → label 1 (fraud), 1 = normal → label 0
    y_pseudo = (pseudo_labels == -1).astype(int)
    
    if y_pseudo.sum() < 2:
        # Not enough pseudo-fraud samples to train — return raw IF scores instead
        scores_raw = iso.score_samples(X)
        scores_norm = 1 - (scores_raw - scores_raw.min()) / (scores_raw.max() - scores_raw.min() + 1e-8)
        return {
            eid: {'ml_signal': float(s), 'ml_explanation': 'Isolation Forest anomaly score (LightGBM training skipped — insufficient samples)'}
            for eid, s in zip(event_ids, scores_norm)
            if s > 0.5
        }
    
    # Step 3: Train LightGBM on pseudo-labels
    lgb_params = {
        'objective': 'binary',
        'metric': 'auc',
        'num_leaves': 15,          # Deliberately small — prevents overfitting on small datasets
        'n_estimators': 50,        # Lightweight — inference in microseconds
        'learning_rate': 0.1,
        'min_child_samples': 2,
        'class_weight': 'balanced',
        'verbose': -1,
        'random_state': 42,
    }
    model = lgb.LGBMClassifier(**lgb_params)
    model.fit(X, y_pseudo)
    
    # Step 4: SHAP explanations
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X)
    # shap_values[1] = SHAP for class 1 (fraud)
    if isinstance(shap_values, list):
        sv = shap_values[1]  # Class 1 (fraud) SHAP values
    else:
        sv = shap_values
    
    # Step 5: Fraud probability scores
    proba = model.predict_proba(X)[:, 1]
    
    # Step 6: Build results
    results = {}
    for i, (event_id, prob) in enumerate(zip(event_ids, proba)):
        if prob < 0.4:
            continue  # Only flag if meaningfully anomalous
        
        # Build human-readable explanation from top-3 SHAP contributors
        shap_row = sv[i]
        top_indices = np.argsort(np.abs(shap_row))[::-1][:3]
        
        explanation_parts = []
        for idx in top_indices:
            feat = FEATURE_COLS[idx]
            val = X[i][idx]
            shap_val = shap_row[idx]
            label = FEATURE_LABELS.get(feat, feat)
            
            if abs(shap_val) < 0.01:
                continue
            
            direction = "unusually high" if shap_val > 0 else "unusually low"
            
            if feat == 'amount_zscore':
                explanation_parts.append(
                    f"{label} was {direction} ({df['amount_zscore'].iloc[i]:.1f}σ from account norm)"
                )
            elif feat == 'hour_of_day':
                explanation_parts.append(
                    f"transaction occurred at {int(df['hour_of_day'].iloc[i]):02d}:00 ({label} flagged)"
                )
            elif feat == 'is_weekend' and val > 0:
                explanation_parts.append("transaction on weekend (elevated risk)")
            elif feat == 'is_night' and val > 0:
                explanation_parts.append("transaction at night-time hours (22:00–06:00)")
            elif feat == 'peer_frequency' and val < 3:
                explanation_parts.append("peer account appears rarely in case data (new/unknown counterparty)")
            elif feat == 'log_amount':
                explanation_parts.append(
                    f"{label} of ₹{df['amount'].iloc[i]:,.0f} flagged as anomalous"
                )
        
        if not explanation_parts:
            explanation_parts = ["Statistical anomaly detected in transaction pattern"]
        
        results[event_id] = {
            'ml_signal': float(prob),
            'ml_explanation': f"LightGBM+SHAP: {'; '.join(explanation_parts)}. (Signal: {prob:.2f}/1.00 — supplementary only, not standalone evidence)"
        }
    
    return results

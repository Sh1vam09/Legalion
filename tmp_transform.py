import json
import os

def transform_to_knowledge_graph(data):
    nodes = []
    links = []
    
    # Primary Entities
    nodes.append({"id": "Developer", "label": "Developer", "group": "Entity", "color": "#3b82f6", "val": 25})
    nodes.append({"id": "Society/RWA", "label": "Society/RWA", "group": "Entity", "color": "#8b5cf6", "val": 25})
    
    clause_analysis = data.get("clause_analysis", [])
    systemic_risks = data.get("systemic_risks", [])
    
    risk_config = {
        "High": {"color": "#ef4444", "val": 20},
        "Medium": {"color": "#f97316", "val": 15},
        "Low": {"color": "#22c55e", "val": 10},
        "Not Assessed": {"color": "#94a3b8", "val": 5}
    }
    
    for clause in clause_analysis:
        c_num = str(clause["clause_number"])
        risk_level = clause.get("overall_risk_level", "Not Assessed")
        config = risk_config.get(risk_level, risk_config["Not Assessed"])
        
        nodes.append({
            "id": c_num,
            "label": f"Clause {c_num}",
            "group": "Clause",
            "val": config["val"],
            "color": config["color"]
        })
        
        # Check for Obligations
        content = clause.get("content", "").lower()
        # Entity-specific keywords
        dev_kws = ["developer shall", "developer will", "developer must", "developer agrees", "developer has agreed"]
        soc_kws = ["society shall", "rwa shall", "society will", "rwa will", "society agrees", "rwa agrees", "rwa is desirous"]
        
        if any(kw in content for kw in dev_kws):
            links.append({
                "source": "Developer",
                "target": c_num,
                "label": "Obligation",
                "type": "Obligation"
            })
        
        if any(kw in content for kw in soc_kws):
            links.append({
                "source": "Society/RWA",
                "target": c_num,
                "label": "Obligation",
                "type": "Obligation"
            })
            
    # Systemic Risk Links
    for risk in systemic_risks:
        involved = risk.get("involved_clauses", [])
        risk_type = risk.get("risk_type", "Conflict")
        
        # Create links between all pairs in involved_clauses
        for i in range(len(involved)):
            for j in range(i + 1, len(involved)):
                links.append({
                    "source": str(involved[i]),
                    "target": str(involved[j]),
                    "label": risk_type,
                    "type": risk_type
                })
                
    return {"nodes": nodes, "links": links}

# Load the data
with open(r"d:\Legalion_WEB-main\backend\data\d93ee98b-5945-4744-a167-87dbdb7c6c1f\final_comprehensive_analysis.json", "r", encoding="utf-8") as f:
    data = json.load(f)

result = transform_to_knowledge_graph(data)
print(json.dumps(result, indent=2))

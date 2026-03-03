#!/usr/bin/env bash
TOKEN=$(cat localStorage.json | jq -r '."auth_token"')
curl -s 'http://localhost:8000/api/projects/all?skip=0&limit=100' -H "Authorization: Bearer $TOKEN" > projects_data.json
python -c '
import json
with open("projects_data.json", "r") as f:
    data = json.load(f)["items"]
    # Iterate through each project to see how external vendors respond to it
    for project in data:
      print("Project:", project["project_name"])
      print("RFP Data:", json.dumps(project["rfp_data"])[:200])
'

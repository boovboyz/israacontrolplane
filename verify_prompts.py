import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_prompts_lifecycle():
    print("Testing Prompt Library Lifecycle...")
    
    # 1. Create a Prompt
    print("\n1. Creating a new prompt...")
    slug = "sales-forecast-v1"
    payload = {
        "name": "Sales Forecast Basic",
        "slug": slug,
        "template": "Analyze the following sales data for {{region}}: {{data}}",
        "author": "verification_script",
        "status": "prod"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/prompts", json=payload)
        if response.status_code == 200:
            print(f"✅ Created prompt: {response.json()['name']}")
        elif response.status_code == 400 and "already exists" in response.text:
             print(f"⚠️ Prompt already exists, continuing...")
        else:
            print(f"❌ Failed to create prompt: {response.status_code} - {response.text}")
            return
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend. Is it running?")
        return

    # 2. List Prompts
    print("\n2. Listing prompts...")
    response = requests.get(f"{BASE_URL}/prompts")
    if response.status_code == 200:
        prompts = response.json()
        print(f"✅ Found {len(prompts)} prompts")
        found = False
        for p in prompts:
            if p['id'] == slug:
                found = True
                break
        if found:
            print(f"✅ Verified '{slug}' is in the list")
        else:
            print(f"❌ '{slug}' not found in list (IDs: {[p['id'] for p in prompts]})")
    else:
        print(f"❌ Failed to list prompts: {response.status_code}")

    # 3. Create a New Version
    print("\n3. Creating a new version...")
    version_payload = {
        "template": "Analyze the sales data for {{region}} and provide a summary: {{data}}",
        "author": "verification_script_v2",
        "commit_message": "Improved instruction"
    }
    response = requests.post(f"{BASE_URL}/prompts/{slug}/versions", json=version_payload)
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Created new version: {data['latest_version']['version']}")
    else:
        print(f"❌ Failed to create version: {response.status_code} - {response.text}")

    # 4. Get Prompt (Latest)
    print("\n4. Fetching latest prompt...")
    response = requests.get(f"{BASE_URL}/prompts/{slug}")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Fetched prompt. Latest version: {data['latest_version']['version']}")
        print(f"   Template: {data['latest_version']['template']}")
    else:
        print(f"❌ Failed to fetch prompt: {response.status_code}")
        
    # 5. Render Prompt (Mock)
    print("\n5. Rendering prompt (Client-side simulation)...")
    # We can test the 'render' endpoint if we implemented it, or just verify variables
    
    # Let's test the render endpoint if available, but recall we prioritized client-side.
    # We implemented `POST /prompts/render` in backend.
    
    # Use the template from step 4
    template_to_render = data['latest_version']['template']
    render_payload = {
        "template": template_to_render,
        "variables": {
            "region": "North America",
            "data": "[100, 200, 300]"
        }
    }
    response = requests.post(f"{BASE_URL}/prompts/render", json=render_payload)
    if response.status_code == 200:
        rendered = response.json()
        print(f"✅ Rendered output: {rendered}")
        if "North America" in rendered:
             print("✅ Variable substitution worked")
        else:
             print("❌ Variable substitution failed")
    else:
        print(f"❌ Failed to render: {response.status_code} - {response.text}")

if __name__ == "__main__":
    test_prompts_lifecycle()

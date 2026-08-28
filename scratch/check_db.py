import urllib.request
import json

url = "https://mibwoiofocgtteyxcezs.supabase.co/rest/v1/"
headers = {
    "apikey": "sb_publishable_PHXNYPAwoblop48bZ6IANg_w32xh1YB",
    "Authorization": "Bearer sb_publishable_PHXNYPAwoblop48bZ6IANg_w32xh1YB"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        data = response.read().decode('utf-8')
        spec = json.loads(data)
        
        # Let's inspect the definitions of devices and bills tables
        definitions = spec.get("definitions", {})
        print("Tables available:")
        for table in definitions.keys():
            print(f"- {table}")
            properties = definitions[table].get("properties", {})
            for col, details in properties.items():
                print(f"  * {col}: {details.get('type')} ({details.get('format', '')})")
except Exception as e:
    print(e)

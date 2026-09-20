import json
import urllib.request
import urllib.error

# 1. Authenticate with JSON credentials
login_data = json.dumps({'email': 'accounts@university.edu', 'password': 'password123'}).encode()
req = urllib.request.Request('http://localhost:8000/api/v1/auth/login', data=login_data, method='POST')
req.add_header('Content-Type', 'application/json')

try:
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
        token = result.get('access_token', '')
        print('[OK] Auth Token acquired for accounts officer.')

        # 2. Trigger Twilio Risk Reminder
        body = json.dumps({
            'student_roll': 'STU1002',
            'channels': ['SMS', 'WHATSAPP', 'IN_APP'],
            'recipient_phone': None
        }).encode()
        req2 = urllib.request.Request(
            'http://localhost:8000/api/v1/integrations/notifications/trigger-risk-reminder',
            data=body,
            method='POST'
        )
        req2.add_header('Content-Type', 'application/json')
        req2.add_header('Authorization', f'Bearer {token}')
        try:
            with urllib.request.urlopen(req2) as resp2:
                r2 = json.loads(resp2.read())
                print('[OK] SUCCESS:', json.dumps(r2, indent=2))
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            print(f'HTTP Error {e.code}:', body)
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f'Login HTTP Error {e.code}:', body)
except Exception as ex:
    import traceback
    traceback.print_exc()


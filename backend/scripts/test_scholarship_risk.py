import urllib.request
import json

def test_api():
    login_data = json.dumps({"email": "aravind.k@student.edu", "password": "Password@123"}).encode('utf-8')
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/auth/login',
        data=login_data,
        headers={'Content-Type': 'application/json'}
    )
    resp = urllib.request.urlopen(req)
    token = json.loads(resp.read().decode('utf-8'))['access_token']
    print('Student logged in, token acquired.')

    # Check student info
    req_stu = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/ledger/students',
        headers={'Authorization': f'Bearer {token}'}
    )
    resp_stu = urllib.request.urlopen(req_stu)
    students = json.loads(resp_stu.read().decode('utf-8'))
    print('Student details:')
    for s in students:
        print(f"Roll: {s['roll_no']}, CGPA: {s.get('cgpa')}, Attendance: {s.get('attendance_percentage')}%, Scholarship: ₹{s.get('scholarship_amount')}")
        print(f"Risk Object: {s.get('scholarship_risk')}")

    # Test Admin login
    admin_login = json.dumps({"email": "finance.officer@institution.edu", "password": "Password@123"}).encode('utf-8')
    req_admin = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/auth/login',
        data=admin_login,
        headers={'Content-Type': 'application/json'}
    )
    resp_admin = urllib.request.urlopen(req_admin)
    admin_token = json.loads(resp_admin.read().decode('utf-8'))['access_token']

    # Test watchlist
    req_wl = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/ledger/scholarship-risk-watchlist',
        headers={'Authorization': f'Bearer {admin_token}'}
    )
    resp_wl = urllib.request.urlopen(req_wl)
    wl_data = json.loads(resp_wl.read().decode('utf-8'))
    print('\nWatchlist Summary:')
    print(f"Total scholarship recipients: {wl_data['total_scholarship_students']}")
    print(f"At-risk count: {wl_data['at_risk_count']}")
    print(f"Total waiver amount at risk: ₹{wl_data['total_waiver_at_risk']:,.2f}")
    for item in wl_data['watchlist'][:3]:
        print(f" - {item['roll_no']} ({item['name']}): CGPA {item['cgpa']}, Att {item['attendance_percentage']}%, Waiver: ₹{item['waiver_amount']}, Risk Msg: {item['risk_message']}")

    # Test update academic metrics endpoint
    print('\nTesting update-academic-metrics (Simulating risk on Aravind Kumar STU1001)...')
    sim_data = json.dumps({"cgpa": 7.20, "attendance_percentage": 71.0}).encode('utf-8')
    req_up = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/ledger/students/STU1001/update-academic-metrics',
        data=sim_data,
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {admin_token}'}
    )
    resp_up = urllib.request.urlopen(req_up)
    up_res = json.loads(resp_up.read().decode('utf-8'))
    print("Simulation result:", up_res)

    # Restore STU1001 back to 8.40 and 86.5%
    restore_data = json.dumps({"cgpa": 8.40, "attendance_percentage": 86.5}).encode('utf-8')
    req_res = urllib.request.Request(
        'http://127.0.0.1:8000/api/v1/ledger/students/STU1001/update-academic-metrics',
        data=restore_data,
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {admin_token}'}
    )
    resp_res = urllib.request.urlopen(req_res)
    rest_res = json.loads(resp_res.read().decode('utf-8'))
    print("Restore result:", rest_res)

if __name__ == '__main__':
    test_api()

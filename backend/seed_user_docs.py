import urllib.request
import json
import uuid
import os

seed_email = os.getenv("SEED_USER_EMAIL", "demo@legallens.ai")
seed_password = os.getenv("SEED_USER_PASSWORD", "DemoSecurePassword@2026")
login_data = json.dumps({'email': seed_email, 'password': seed_password}).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:8000/api/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as resp:
        token = json.loads(resp.read().decode('utf-8'))['access_token']
except Exception:
    # Auto-register test account if not already present
    reg_data = json.dumps({'name': 'Demo User', 'email': seed_email, 'password': seed_password}).encode('utf-8')
    reg_req = urllib.request.Request('http://127.0.0.1:8000/api/auth/register', data=reg_data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(reg_req) as resp:
        token = json.loads(resp.read().decode('utf-8'))['access_token']
print('Authenticated token obtained!')

def upload_file(filepath):
    filename = os.path.basename(filepath)
    with open(filepath, 'rb') as f:
        file_bytes = f.read()
    
    boundary = '----WebKitFormBoundary' + uuid.uuid4().hex
    prefix = (
        f'--{boundary}\r\n'
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f'Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n'
    ).encode('utf-8')
    suffix = f'\r\n--{boundary}--\r\n'.encode('utf-8')
    body = prefix + file_bytes + suffix
    
    upload_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/documents/upload',
        data=body,
        headers={
            'Content-Type': f'multipart/form-data; boundary={boundary}',
            'Authorization': f'Bearer {token}'
        }
    )
    with urllib.request.urlopen(upload_req) as r:
        res = json.loads(r.read().decode('utf-8'))
        print('Uploaded:', res.get('filename'), 'Status:', res.get('status'), 'ID:', res.get('id'), 'Risk:', res.get('risk_level'))
        return res

doc1 = upload_file('../sample_documents/Consulting_Agreement_v1.docx')
doc2 = upload_file('../sample_documents/Consulting_Agreement_v2_Revised.docx')
print('Finished uploading sample docs!')

import requests
import sys

def check_health():
    try:
        response = requests.get('http://localhost:5000/health', timeout=5)
        if response.status_code == 200 and response.json()['status'] == 'healthy':
            print('Health check passed')
            sys.exit(0)
        else:
            print(f'Health check failed: {response.json()}')
            sys.exit(1)
    except Exception as e:
        print(f'Health check error: {str(e)}')
        sys.exit(1)

if __name__ == '__main__':
    check_health()
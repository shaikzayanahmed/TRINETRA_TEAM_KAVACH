import urllib.request
import json

def test():
    try:
        r = urllib.request.urlopen("http://127.0.0.1:8000/api/health")
        print("Health:", r.read().decode())
    except Exception as e:
        print("Health error:", e)

    try:
        r = urllib.request.urlopen("http://127.0.0.1:8000/api/cameras")
        print("Cameras:", r.read().decode())
    except Exception as e:
        print("Cameras error:", e)

    try:
        r = urllib.request.urlopen("http://127.0.0.1:8000/api/alerts")
        print("Alerts:", r.read().decode())
    except Exception as e:
        print("Alerts error:", e)

    try:
        r = urllib.request.urlopen("http://127.0.0.1:8000/api/evidence")
        print("Evidence:", r.read().decode())
    except Exception as e:
        print("Evidence error:", e)

if __name__ == "__main__":
    test()

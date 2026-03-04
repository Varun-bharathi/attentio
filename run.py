import os
import sys
import subprocess

def main():
    print("Starting Attentio Backend (Express) & AI Service...")
    os.chdir(os.path.join(os.path.dirname(__file__), 'backend'))
    subprocess.run(["node", "server.js"])

if __name__ == "__main__":
    main()

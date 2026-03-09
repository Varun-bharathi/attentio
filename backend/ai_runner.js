const { spawn } = require('child_process');
const path = require('path');

let aiProcess = null;
let isInstalling = false;

function startAI(onResult) {
    if (isInstalling) return;

    const aiPath = path.join(__dirname, 'ai_module', 'runner.py');

    console.log(`Starting AI runner using python from: ${aiPath}`);

    // Use 'python' or 'python3' based on environment, '-u' means unbuffered
    aiProcess = spawn('python', ['-u', aiPath]);

    aiProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            line = line.trim();
            if (!line) return;
            try {
                const out = JSON.parse(line);
                if (out.sid && onResult) {
                    onResult(out.sid, out.result);
                } else if (out.error) {
                    console.error('[AI Module Error]', out.error);
                }
            } catch (e) {
                console.log('[AI Module Log]', line);
            }
        });
    });

    aiProcess.stderr.on('data', (data) => {
        const stderrOutput = data.toString();
        // Still print the actual error to console 
        console.error('[AI Module STDERR]:', stderrOutput);

        // Auto-install missing Python modules
        const match = stderrOutput.match(/(?:ModuleNotFoundError|ImportError): No module named '([^']+)'/);
        if (match && match[1] && !isInstalling) {
            let missingModule = match[1].split('.')[0]; // Only take the top-level package name

            // Map internal import names to their pip package names specifically for this project
            const moduleMap = {
                'cv2': 'opencv-python',
                'google': 'protobuf<4' // We know mediapipe requires protobuf<4 
            };

            const installName = moduleMap[missingModule] || missingModule;

            console.log(`\n[AI Auto-Fix] Missing Python module detected: '${missingModule}'. Attempting to auto-install '${installName}'...`);

            isInstalling = true;
            if (aiProcess) aiProcess.kill(); // Kill the crashed python process

            const pipProcess = spawn('python', ['-m', 'pip', 'install', installName]);

            pipProcess.stdout.on('data', (d) => process.stdout.write(`[PIP] ${d}`));
            pipProcess.stderr.on('data', (d) => process.stderr.write(`[PIP Error] ${d}`));

            pipProcess.on('close', (code) => {
                isInstalling = false;
                if (code === 0) {
                    console.log(`[AI Auto-Fix] Successfully installed '${installName}'. Restarting AI runner now...`);
                    startAI(onResult);
                } else {
                    console.error(`[AI Auto-Fix] Failed to automatically install '${installName}'. Please install it manually.`);
                }
            });
        }
    });

    aiProcess.on('close', (code) => {
        if (!isInstalling) {
            console.log(`[AI Module] Process exited with code ${code}`);
        }
    });
}

function analyzeFrame(sid, frameData) {
    if (aiProcess && !aiProcess.killed) {
        try {
            const payload = JSON.stringify({ sid, frame: frameData });
            aiProcess.stdin.write(payload + '\n');
        } catch (err) {
            console.error('Failed to send frame to AI module', err);
        }
    }
}

function stopAI() {
    if (aiProcess) aiProcess.kill();
}

module.exports = { startAI, stopAI, analyzeFrame };

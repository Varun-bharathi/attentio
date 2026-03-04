const { spawn } = require('child_process');
const path = require('path');

let aiProcess = null;

function startAI(onResult) {
    const aiPath = path.join(__dirname, '..', 'ai_module', 'runner.py');

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
        console.error('[AI Module STDERR]:', data.toString());
    });

    aiProcess.on('close', (code) => {
        console.log(`[AI Module] Process exited with code ${code}`);
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
